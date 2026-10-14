/**
 * Deploy worker — simulates the Vercel deploy flow.
 *
 * D7 deliverable.
 *
 * Handoff (Saqib, D7): In prod, swap this for the real Vercel REST API:
 *   - POST https://api.vercel.com/v13/deployments with the zip as a file upload
 *   - GET https://api.vercel.com/v2/deployments/{id}/events for streaming build logs
 *   - On completion, set sites.deployUrl = `https://${deployment.url}`
 *
 * The MVP simulates the deploy with realistic-looking log lines and a
 * 6-8 second duration so the streaming UX is demonstrable.
 *
 * Same pub/sub pattern as the generation worker — events are published
 * via the local bus, the SSE route forwards them to the browser.
 */

import { prisma } from './db';
import { publish } from './pubsub';
import { recordLedger } from './ledger';
import type { GenerateEvent } from '../api/contracts';

// In-memory deploy queue (parallel to the generation queue)
const queue: string[] = [];
let workerRunning = false;

export function enqueueDeploy(siteId: string): void {
  queue.push(siteId);
  if (!workerRunning) {
    workerRunning = true;
    void runWorker();
  }
}

async function runWorker() {
  while (queue.length > 0) {
    const siteId = queue.shift()!;
    try {
      await processDeploy(siteId);
    } catch (err) {
      console.error(`[deploy-worker] site ${siteId} failed:`, err);
      publish(siteId, {
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown deploy error',
        retryable: true,
      } satisfies GenerateEvent);
    }
  }
  workerRunning = false;
}

async function processDeploy(siteId: string): Promise<void> {
  const site = await prisma.sites.findUnique({ where: { id: siteId } });
  if (!site) throw new Error(`Site ${siteId} not found`);

  // 1. Acknowledge start
  publish(siteId, { type: 'started', totalPages: 6, estimatedSeconds: 8 } satisfies GenerateEvent);
  await sleep(400);

  // 2. Simulated Vercel build logs
  const steps: Array<{ name: string; durationMs: number; status: 'ok' | 'warn' }> = [
    { name: 'Uploading site zip to Vercel', durationMs: 900, status: 'ok' },
    { name: 'Extracting static files (8 pages + manifest.json + README.md)', durationMs: 700, status: 'ok' },
    { name: 'Detecting framework: Static HTML', durationMs: 300, status: 'ok' },
    { name: 'Running build — static export', durationMs: 1400, status: 'ok' },
    { name: 'Provisioning edge functions', durationMs: 600, status: 'ok' },
    { name: 'Assigning domain + HTTPS certificate', durationMs: 1100, status: 'ok' },
  ];

  let done = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    publish(siteId, {
      type: 'page-started',
      page: i + 1,
      pageName: step.name,
    } satisfies GenerateEvent);
    await sleep(step.durationMs * 0.3);

    publish(siteId, {
      type: 'log',
      level: 'info',
      message: step.status === 'warn' ? `Warning: ${step.name} completed with non-blocking issues.` : `${step.name}...`,
    } satisfies GenerateEvent);
    await sleep(step.durationMs * 0.6);

    publish(siteId, {
      type: 'page-complete',
      page: i + 1,
      pageName: step.name,
      durationMs: step.durationMs,
    } satisfies GenerateEvent);

    done++;
    publish(siteId, {
      type: 'progress',
      page: done,
      totalPages: steps.length,
      percent: Math.round((done / steps.length) * 100),
    } satisfies GenerateEvent);
  }

  // 3. Generate a fake Vercel URL
  const slug = site.businessName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
  const deployUrl = `https://${slug}-${site.id.slice(-6)}.vercel.app`;

  // 4. Persist the deploy URL on the sites row
  await prisma.sites.update({
    where: { id: siteId },
    data: { deployUrl },
  });

  // 5. Emit done
  publish(siteId, {
    type: 'done',
    siteId,
    totalPages: steps.length,
    totalCostUsd: 0,  // deploys are free on Vercel hobby tier
    previewUrl: deployUrl,
  } satisfies GenerateEvent);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
