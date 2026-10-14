/**
 * Spend cap enforcement — FR-PLT-04.
 *
 * Enforces the user's monthly spend cap. Records every AI call to the
 * ledger + spend_caps tables. Triggers 80% / 100% notifications.
 *
 * Usage:
 *   await enforceSpendCap(user.id, 0.05);   // throws if would exceed cap
 *   await recordLedger({ userId, step, model, costUsd, ... });
 *
 * Setup: just run `prisma migrate deploy` — the spend_caps table is in schema.prisma.
 */

import { prisma } from './db';
import { getCurrentUser } from './auth';
import { trackSpendCapHit } from './analytics';
import { captureMessage } from './sentry';

function currentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getOrCreateSpendCap(userId: string, monthYear: string = currentMonthYear()) {
  return prisma.spend_caps.upsert({
    where: { userId_monthYear: { userId, monthYear } },
    create: { userId, monthYear, capUsd: 0 },
    update: {},
  });
}

/**
 * Check whether the user can spend `incrementUsd` more without exceeding cap.
 * Throws if it would exceed.
 */
export async function enforceSpendCap(userId: string, incrementUsd: number): Promise<void> {
  const cap = await getOrCreateSpendCap(userId);
  if (cap.capUsd <= 0) return; // no cap set

  const newTotal = cap.spentUsd + incrementUsd;
  if (newTotal > cap.capUsd) {
    trackSpendCapHit(userId, incrementUsd, cap.capUsd);
    captureMessage(`Spend cap exceeded: user ${userId} tried ${incrementUsd} (cap ${cap.capUsd})`, 'warning', {
      tags: { cap_hit: true }, extra: { userId, incrementUsd, capUsd: cap.capUsd, spentUsd: cap.spentUsd },
    });
    throw new Error(`Spend cap exceeded: your $${cap.capUsd.toFixed(2)}/month cap is at $${cap.spentUsd.toFixed(2)}. This call would add $${incrementUsd.toFixed(4)}.`);
  }

  // 80% notification
  if (!cap.notify80Sent && newTotal >= cap.capUsd * 0.8) {
    await prisma.spend_caps.update({ where: { id: cap.id }, data: { notify80Sent: true } });
    captureMessage(`Spend cap 80% reached for user ${userId}`, 'info', { extra: { userId, spentUsd: newTotal, capUsd: cap.capUsd } });
  }
}

/**
 * Record a spend increment + update the running total.
 * Called after every successful LLM call.
 */
export async function recordSpend(userId: string, incrementUsd: number, projectId?: string): Promise<void> {
  const monthYear = currentMonthYear();
  await prisma.spend_caps.update({
    where: { userId_monthYear: { userId, monthYear } },
    data: { spentUsd: { increment: incrementUsd } },
  });

  // 100% notification (one-shot)
  const cap = await prisma.spend_caps.findUnique({ where: { userId_monthYear: { userId, monthYear } } });
  if (cap && !cap.notify100Sent && cap.spentUsd >= cap.capUsd && cap.capUsd > 0) {
    await prisma.spend_caps.update({ where: { id: cap.id }, data: { notify100Sent: true } });
    captureMessage(`Spend cap 100% reached for user ${userId}`, 'warning', { extra: { userId, spentUsd: cap.spentUsd, capUsd: cap.capUsd } });
  }
}

/**
 * Set or update the user's monthly cap.
 */
export async function setSpendCap(userId: string, capUsd: number): Promise<void> {
  const monthYear = currentMonthYear();
  await prisma.spend_caps.upsert({
    where: { userId_monthYear: { userId, monthYear } },
    create: { userId, monthYear, capUsd },
    update: { capUsd, notify80Sent: false, notify100Sent: false },
  });
}

export async function getSpendStatus(userId: string): Promise<{ capUsd: number; spentUsd: number; percent: number }> {
  const cap = await getOrCreateSpendCap(userId);
  return {
    capUsd: cap.capUsd,
    spentUsd: cap.spentUsd,
    percent: cap.capUsd > 0 ? Math.round((cap.spentUsd / cap.capUsd) * 100) : 0,
  };
}
