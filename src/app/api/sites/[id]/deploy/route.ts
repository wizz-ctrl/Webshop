export const dynamic = "force-dynamic";

/**
 * ROUTE HANDLER — Enqueue site deploy.
 *
 * D7 deliverable.
 *
 * POST /api/sites/[id]/deploy
 *   - Marks the site as ready to deploy
 *   - Enqueues the deploy worker (simulated for MVP)
 *   - Returns { ok: true, streamPath }
 *
 * Handoff (Saqib, D7): In prod, this:
 *   1. Reads the user's Vercel access token from users.vercelTokenEncrypted
 *   2. Uploads the site zip to Vercel's deployment API
 *   3. Returns the deployment ID + the SSE stream path
 *   4. The deploy-worker subscribes to Vercel's build events API and republishes via pubsub
 */

import { NextResponse, type NextRequest } from 'next/server';
import { enqueueDeploy } from '../../../../../lib/server/deploy-worker';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    enqueueDeploy(id);
    return NextResponse.json({ ok: true, streamPath: `/api/sites/${id}/deploy/stream` });
  } catch (err) {
    console.error('[sites/[id]/deploy] POST error:', err);
    return NextResponse.json({ error: 'Could not start deploy.' }, { status: 500 });
  }
}
