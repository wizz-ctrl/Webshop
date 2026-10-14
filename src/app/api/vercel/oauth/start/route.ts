export const dynamic = "force-dynamic";

/**
 * ROUTE HANDLER — Start Vercel OAuth flow.
 *
 * D7 deliverable.
 *
 * Stub: redirects to a fake Vercel OAuth URL with PKCE-style params.
 * The /callback handler below completes the simulation.
 *
 * Handoff (Saqib, D7): In prod, this generates a real PKCE code_verifier +
 * code_challenge, stores them in a session, and redirects to:
 *   https://vercel.com/oauth/authorize?client_id=...&redirect_uri=...&code_challenge=...&state=...
 *
 * Replace the fake URL below with the real one.
 */

import { NextResponse, type NextRequest } from 'next/server';

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID || 'localloop_dev_stub';
const REDIRECT_URI = process.env.VERCEL_REDIRECT_URI || 'http://localhost:3000/api/vercel/oauth/callback';

export async function POST(_req: NextRequest) {
  // Generate a random state token (stub — in prod, store in session)
  const state = `state_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const params = new URLSearchParams({
    client_id: VERCEL_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state,
    scope: 'deploy',
  });

  // In prod, redirect to https://vercel.com/oauth/authorize?...&code_challenge=...
  // For the MVP stub, we return the URL as JSON so the frontend can open it in a popup.
  const oauthUrl = `https://vercel.com/oauth/authorize?${params.toString()}`;

  return NextResponse.json({ ok: true, oauthUrl, state });
}
