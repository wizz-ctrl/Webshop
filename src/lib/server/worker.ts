import { prisma } from './db';
import { publish } from './pubsub';
import { recordLedger } from './ledger';
import { contentGenerate } from '../ai/agents/content-generate';
import { packageSite } from './site-packager';
import type { GenerateEvent } from '../api/contracts';
import type { ContentGenerateOutput } from '../ai/schemas';

const queue: string[] = [];
let workerRunning = false;

export function enqueue(siteId: string): void {
  queue.push(siteId);
  if (!workerRunning) { workerRunning = true; void runWorker(); }
}

async function runWorker() {
  while (queue.length > 0) {
    const siteId = queue.shift()!;
    try { await processSite(siteId); }
    catch (err) {
      console.error(`[worker] site ${siteId} failed:`, err);
      publish(siteId, { type: 'error', message: err instanceof Error ? err.message : 'Unknown worker error', retryable: true } satisfies GenerateEvent);
      try { await prisma.sites.update({ where: { id: siteId }, data: { status: 'failed' } }); } catch {}
    }
  }
  workerRunning = false;
}

const siteZipPaths = new Map<string, string>();
export { siteZipPaths };

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

async function processSite(siteId: string): Promise<void> {
  const site = await prisma.sites.findUnique({ where: { id: siteId } });
  if (!site) throw new Error(`Site ${siteId} not found`);
  const project = await prisma.projects.findUnique({ where: { id: site.projectId }, include: { services: true, locations: true, blog_titles: true, keywords: true } });
  if (!project) throw new Error(`Project ${site.projectId} not found`);

  const corePages = ['Home', 'About', 'Contact', 'Privacy'];
  const servicePages = project.services.map((s: any) => s.name);
  const locationPages = project.locations.map((l: any) => `${l.name} Area`);
  const blogPages = project.blog_titles.map((b: any) => b.title);
  const allPages = [...corePages, ...servicePages, ...locationPages, ...blogPages];
  const totalPages = allPages.length;

  publish(siteId, { type: 'started', totalPages, estimatedSeconds: totalPages * 2 } satisfies GenerateEvent);
  await sleep(200);

  let done = 0; let totalCost = 0;
  const pageContents: Array<{ pageName: string; content: ContentGenerateOutput }> = [];

  for (let i = 0; i < totalPages; i++) {
    const pageName = allPages[i];
    const pageType = pageName === 'Home' ? 'home' : pageName === 'About' ? 'about' : pageName === 'Contact' ? 'contact' : pageName === 'Privacy' ? 'privacy' : locationPages.includes(pageName) ? 'location' : servicePages.includes(pageName) ? 'service' : 'blog';
    const keywordRow = project.keywords.find((k: any) => k.pageType === pageName);
    const keywords = keywordRow ? { primary: JSON.parse(keywordRow.primary), secondary: JSON.parse(keywordRow.secondary), longtail: JSON.parse(keywordRow.longTail) } : undefined;

    publish(siteId, { type: 'page-started', page: i + 1, pageName } satisfies GenerateEvent);
    await sleep(150 + Math.random() * 200);
    publish(siteId, { type: 'log', level: 'info', message: `Drafting ${pageName} — calling content-generate agent.` } satisfies GenerateEvent);

    const startTime = Date.now();
    const content = await contentGenerate({ businessName: site.businessName || project.businessName || 'Untitled Business', niche: project.niche || '', tone: 'friendly', pageName, pageType, keywords, services: project.services.map((s: any) => s.name), locations: project.locations.map((l: any) => l.name), allPages }, project.id);
    const durationMs = Date.now() - startTime;
    pageContents.push({ pageName, content });
    publish(siteId, { type: 'page-complete', page: i + 1, pageName, durationMs } satisfies GenerateEvent);
    totalCost += 0.003;
    done++;
    publish(siteId, { type: 'progress', page: done, totalPages, percent: Math.round((done / totalPages) * 100) } satisfies GenerateEvent);
  }

  const zipPath = await packageSite(site, project, allPages, pageContents);
  totalCost += 0.04 * 8;
  publish(siteId, { type: 'done', siteId, totalPages, totalCostUsd: totalCost, previewUrl: `/api/sites/${siteId}/preview-html` } satisfies GenerateEvent);

  await prisma.sites.update({ where: { id: siteId }, data: { status: 'live', costUsd: totalCost, pageCount: totalPages, generatedAt: new Date() } });
  await prisma.projects.update({ where: { id: site.projectId }, data: { status: 'complete' } });
  siteZipPaths.set(siteId, zipPath);
}
