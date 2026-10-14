/**
 * In-memory rate limiter — 200/min per user per action.
 * Swap for Upstash Redis in production (see prod-ready/rate-limit.ts).
 */
interface Bucket { timestamps: number[]; }
const WINDOW_MS = 60_000;
const LIMIT = 200;
const buckets = new Map<string, Bucket>();

export function rateLimitSync(userId: string, action: string): { ok: boolean; remaining: number; resetMs: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
  if (bucket.timestamps.length >= LIMIT) {
    const oldest = bucket.timestamps[0];
    return { ok: false, remaining: 0, resetMs: WINDOW_MS - (now - oldest) };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: LIMIT - bucket.timestamps.length, resetMs: WINDOW_MS };
}

export async function rateLimit(userId: string, action: string): Promise<{ ok: boolean; remaining: number; resetMs: number }> {
  return rateLimitSync(userId, action);
}

export function _resetRateLimit(userId: string, action: string): void {
  buckets.delete(`${userId}:${action}`);
}
