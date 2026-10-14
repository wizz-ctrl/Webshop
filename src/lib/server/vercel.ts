/**
 * Vercel OAuth + Deploy API client (production-ready).
 *
 * Implements:
 *   - PKCE OAuth flow (start → callback → token storage)
 *   - Deploy site via POST /v13/deployments
 *   - Stream build events via GET /v6/deployments/{id}/events
 *
 * Setup:
 *   1. Create a Vercel OAuth app at https://vercel.com/dashboard/applications/new
 *   2. Set redirect URI to: https://YOUR-DOMAIN/api/vercel/oauth/callback
 *   3. Set in .env:
 *        VERCEL_CLIENT_ID=...
 *        VERCEL_CLIENT_SECRET=...
 *        VERCEL_REDIRECT_URI=https://YOUR-DOMAIN/api/vercel/oauth/callback
 *
 * When VERCEL_CLIENT_ID is unset, the OAuth endpoints return a simulated
 * flow so the deploy wizard still works end-to-end for demos.
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import { getCurrentUser } from './auth';
import { encrypt, decrypt } from './crypto';

const USE_REAL_VERCEL = !!(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET);
const VERCEL_API_BASE = process.env.VERCEL_API_BASE || 'https://api.vercel.com';

// ── PKCE helpers ──

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

// ── OAuth start ──

export async function startVercelOAuth(): Promise<{ oauthUrl: string; state: string; verifier: string }> {
  const { verifier, challenge } = generatePkce();
  const state = base64url(randomBytes(16));

  if (!USE_REAL_VERCEL) {
    // Simulated flow for demos — redirect to a fake URL
    const params = new URLSearchParams({
      client_id: 'stub',
      redirect_uri: process.env.VERCEL_REDIRECT_URI || 'http://localhost:3000/api/vercel/oauth/callback',
      response_type: 'code',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope: 'deploy',
    });
    return {
      oauthUrl: `https://vercel.com/oauth/authorize?${params.toString()}`,
      state, verifier,
    };
  }

  const params = new URLSearchParams({
    client_id: process.env.VERCEL_CLIENT_ID!,
    redirect_uri: process.env.VERCEL_REDIRECT_URI!,
    response_type: 'code',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'deploy',
  });
  return {
    oauthUrl: `https://vercel.com/oauth/authorize?${params.toString()}`,
    state, verifier,
  };
}

// ── OAuth callback — exchange code for access token ──

export async function exchangeVercelCode(code: string, verifier: string): Promise<{ accessToken: string; refreshToken?: string }> {
  if (!USE_REAL_VERCEL) {
    // Simulated token
    return { accessToken: `vrc_sim_${Date.now()}_${Math.random().toString(36).slice(2, 12)}` };
  }

  const res = await fetch(`${VERCEL_API_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VERCEL_CLIENT_ID!,
      client_secret: process.env.VERCEL_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.VERCEL_REDIRECT_URI!,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vercel token exchange failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json() as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

// ── Save the user's Vercel token (AES-256-GCM encrypted) ──

export async function saveVercelToken(accessToken: string, refreshToken?: string): Promise<void> {
  const user = await getCurrentUser();
  const payload = JSON.stringify({ accessToken, refreshToken });
  const ciphertext = encrypt(payload);
  await prisma.users.update({
    where: { id: user.id },
    data: { vercelTokenEncrypted: ciphertext },
  });
}

// ── Retrieve the user's Vercel token ──

export async function getVercelToken(): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const user = await getCurrentUser();
  const u = await prisma.users.findUnique({ where: { id: user.id } });
  if (!u?.vercelTokenEncrypted) return null;
  try {
    const payload = decrypt(u.vercelTokenEncrypted);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// ── Deploy a site to Vercel ──

export interface VercelDeployResult {
  deploymentId: string;
  deploymentUrl: string;
  inspectUrl: string;
}

export async function deployToVercel(siteId: string, zipBuffer: Buffer, projectName: string): Promise<VercelDeployResult> {
  const tokens = await getVercelToken();
  if (!tokens) {
    throw new Error('Vercel not authorized. Run the deploy wizard OAuth flow first.');
  }

  // Vercel v13 deploy endpoint accepts a zip file via multipart form-data
  // We need to construct the multipart body manually (no FormData in Node 20+ fetch by default)
  const formData = new FormData();
  formData.append('name', projectName);
  formData.append('target', 'production');
  const file = new Blob([zipBuffer as any], { type: 'application/zip' });
  formData.append('file', file, `${projectName}.zip`);

  const res = await fetch(`${VERCEL_API_BASE}/v13/deployments?skipVsBuilderServlet=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': `multipart/form-data; boundary=${(formData as any)._boundary}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vercel deploy failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json() as any;
  return {
    deploymentId: data.id || data.uid,
    deploymentUrl: `https://${data.url}`,
    inspectUrl: data.inspectorUrl || `https://vercel.com/inspect/${data.id || data.uid}`,
  };
}

// ── Stream Vercel build events (async generator) ──

export async function* streamVercelBuildEvents(deploymentId: string): AsyncGenerator<{ type: string; message: string; created?: number }> {
  const tokens = await getVercelToken();
  if (!tokens) return;
  const url = `${VERCEL_API_BASE}/v6/deployments/${deploymentId}/events?limit=100&builds=1`;
  let lastEventId = '';
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` },
      });
      if (!res.ok) break;
      const data = await res.json() as any;
      const events = data.events || [];
      for (const evt of events) {
        if (evt.created && `${evt.created}` <= lastEventId) continue;
        lastEventId = `${evt.created}`;
        yield {
          type: evt.type || 'log',
          message: evt.text || evt.payload?.message || JSON.stringify(evt),
          created: evt.created,
        };
      }
      // Check deployment status — stop on READY/ERROR
      const status = data.deployment?.status;
      if (status === 'READY' || status === 'ERROR') break;
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error('[vercel] stream error:', err);
      break;
    }
  }
}
