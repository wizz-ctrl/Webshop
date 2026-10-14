/**
 * ROUTE HANDLER — SSE stream for deploy logs.
 *
 * D7 deliverable.
 *
 * GET /api/sites/[id]/deploy/stream
 *   - Subscribes to the pubsub bus for `site:${id}` (same channel as the
 *     generation worker — the deploy worker publishes events there too)
 *   - Forwards each event to the browser as an SSE message
 *   - Closes when the worker emits a `done` or `error` event
 *
 * Same wire format as /api/sites/[id]/stream — GenerateEvent from contracts.ts.
 * The frontend reuses the StreamingLog component for both flows.
 */

import type { NextRequest } from 'next/server';
import { subscribe } from '../../../../../../lib/server/pubsub';
import type { GenerateEvent } from '../../../../../../lib/api/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sse(event: GenerateEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: GenerateEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse(event)));
        } catch {
          closed = true;
        }
        if (event.type === 'done' || event.type === 'error') {
          close();
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };

      const unsubscribe = subscribe(id, (event: any) => send(event as GenerateEvent));

      const heartbeat = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { close(); }
      }, 25_000);

      const safety = setTimeout(close, 5 * 60_000);

      return () => {
        clearInterval(heartbeat);
        clearTimeout(safety);
        unsubscribe();
        close();
      };
    },
    cancel() { /* browser closed */ },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
