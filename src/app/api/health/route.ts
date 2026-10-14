/**
 * Health check endpoint.
 *
 * D8 deliverable (NFR-M-02: "All services shall expose health endpoints").
 *
 * GET /api/health
 *   Returns 200 if all subsystems are reachable:
 *     - Database (Prisma)
 *     - LLM provider (best-effort — doesn't actually call, just checks env)
 *     - Pubsub bus (always ok — in-process)
 *     - Worker queue (always ok — in-process)
 *
 * Returns 503 if any subsystem is down.
 *
 * Handoff (Saqib, D8): In prod, add Sentry / Datadog synthetic checks
 * that hit this endpoint every 60s and alert on non-200.
 */

import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/server/db';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  message?: string;
}

export async function GET() {
  const checks: HealthCheck[] = [];

  // 1. Database
  try {
    const start = Date.now();
    await prisma.users.count({ take: 1 });
    checks.push({ name: 'database', status: 'ok', latencyMs: Date.now() - start });
  } catch (err) {
    checks.push({
      name: 'database',
      status: 'down',
      message: err instanceof Error ? err.message : 'DB unreachable',
    });
  }

  // 2. LLM provider (just env check — no actual call)
  const llmKey = process.env.OPENROUTER_DEV_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  checks.push({
    name: 'llm-provider',
    status: llmKey ? 'ok' : 'degraded',
    message: llmKey ? 'Configured' : 'No LLM key set — agents will use canned fallback',
  });

  // 3. Pubsub (always ok — in-process)
  checks.push({ name: 'pubsub', status: 'ok' });

  // 4. Worker (always ok — in-process)
  checks.push({ name: 'worker', status: 'ok' });

  const anyDown = checks.some((c) => c.status === 'down');
  const anyDegraded = checks.some((c) => c.status === 'degraded');

  return NextResponse.json(
    {
      status: anyDown ? 'down' : anyDegraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: anyDown ? 503 : 200 },
  );
}
