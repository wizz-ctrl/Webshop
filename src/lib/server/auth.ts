/**
 * Auth — dev-user fallback only (no NextAuth).
 * Swap for NextAuth v5 in production (see prod-ready/auth.ts).
 */
import { prisma } from './db';
const DEV_EMAIL = 'abdul@localloop.dev'; const DEV_NAME = 'Abdul Raheem';
let cached: { id: string; email: string; name: string | null; plan: string } | null = null;
export async function getCurrentUser(): Promise<{ id: string; email: string; name: string | null; plan: string }> {
  if (cached) return cached;
  const user = await prisma.users.upsert({ where: { email: DEV_EMAIL }, create: { email: DEV_EMAIL, name: DEV_NAME, plan: 'free' }, update: {} });
  cached = { id: user.id, email: user.email, name: user.name, plan: user.plan };
  return cached;
}
