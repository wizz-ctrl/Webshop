export const dynamic = "force-dynamic";

/**
 * ROUTE HANDLER — Vercel OAuth callback.
 *
 * D7 deliverable.
 *
 * Stub: simulates the token exchange + returns a fake Vercel access token.
 *
 * Handoff (Saqib, D7): In prod, this:
 *   1. Receives ?code=...&state=... from Vercel
 *   2. Validates state against the session
 *   3. POSTs to https://vercel.com/oauth/access_token with code + code_verifier
 *   4. Stores the access_token on the user row (vercelTokenEncrypted via AES-256-GCM)
 *   5. Redirects back to /dashboard/sites/[id]/deploy?vercel=connected
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?vercel_error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?vercel_error=missing_params', req.url));
  }

  // Stub: pretend we exchanged the code for a token
  const fakeAccessToken = `vrc_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  // In prod: encrypt and store this token on the user row
  // For MVP: pass it through as a query param so the frontend can complete the wizard
  const redirectUrl = new URL('/dashboard/sites', req.url);
  redirectUrl.searchParams.set('vercel_connected', '1');
  redirectUrl.searchParams.set('vercel_token', fakeAccessToken);

  return NextResponse.redirect(redirectUrl);
}
