import { prisma } from './db';
import { getDevUser } from './dev-user';
export interface LedgerInput { step: string; model: string; promptTokens: number; completionTokens: number; costUsd: number; projectId?: string; }
export async function recordLedger(input: LedgerInput): Promise<void> {
  const user = await getDevUser();
  try { await prisma.openrouter_ledger.create({ data: { userId: user.id, projectId: input.projectId || null, step: input.step, model: input.model, promptTokens: input.promptTokens, completionTokens: input.completionTokens, costUsd: input.costUsd } }); } catch (err) { console.error('[ledger] write failed', err); }
}
export async function enforceCap(_projectId: string, _incrementUsd: number): Promise<void> { return; }
