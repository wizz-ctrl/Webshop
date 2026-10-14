import { createWriteStream, mkdirSync, existsSync, readFileSync, createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';

const SITES_DIR = process.env.SITES_DIR || '.data/sites';

export function getZipPath(siteId: string): string { return join(SITES_DIR, `${siteId}.zip`); }
export function zipExists(siteId: string): boolean { return existsSync(getZipPath(siteId)); }
export function openZipWriteStream(siteId: string) { mkdirSync(SITES_DIR, { recursive: true }); return createWriteStream(getZipPath(siteId)); }
export function readZip(siteId: string): Buffer { return readFileSync(getZipPath(siteId)); }
export async function downloadSiteZip(siteId: string): Promise<{ stream: NodeJS.ReadableStream; size: number; source: 'local' }> {
  const localPath = getZipPath(siteId);
  if (!existsSync(localPath)) throw new Error(`Zip not found: ${localPath}`);
  return { stream: createReadStream(localPath), size: statSync(localPath).size, source: 'local' };
}
export async function uploadSiteZip(siteId: string): Promise<void> { }
