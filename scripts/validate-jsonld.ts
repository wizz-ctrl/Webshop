/**
 * JSON-LD validator — runs in CI, blocks merges on regression.
 *
 * D9 deliverable. Maps to SRS requirement FR-GEN-05: "100% of generated
 * pages pass a JSON-LD validator in CI."
 *
 * Usage:
 *   npx tsx scripts/validate-jsonld.ts <path-to-zip-or-html>
 *
 * Exits 0 if all pages pass schema.org/LocalBusiness validation.
 * Exits 1 if any page fails.
 *
 * Wire into package.json:
 *   "scripts": {
 *     "validate:jsonld": "tsx scripts/validate-jsonld.ts .data/sites"
 *   }
 *
 * And into CI (GitHub Actions):
 *   - run: npm run validate:jsonld
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface JsonLdValidation {
  file: string;
  valid: boolean;
  error?: string;
  hasLocalBusiness?: boolean;
}

function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const regex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch (err) {
      // invalid JSON-LD — return as string so caller can flag it
      blocks.push({ _parseError: err instanceof Error ? err.message : 'parse failed', _raw: match[1].slice(0, 200) });
    }
  }
  return blocks;
}

function validateLocalBusiness(jsonLd: unknown): { valid: boolean; error?: string } {
  if (!jsonLd || typeof jsonLd !== 'object') {
    return { valid: false, error: 'JSON-LD is not an object' };
  }
  const obj = jsonLd as Record<string, unknown>;
  if (obj['@context'] !== 'https://schema.org') {
    return { valid: false, error: `@context must be "https://schema.org", got: ${String(obj['@context'])}` };
  }
  if (obj['@type'] !== 'LocalBusiness') {
    return { valid: false, error: `@type must be "LocalBusiness", got: ${String(obj['@type'])}` };
  }
  if (typeof obj.name !== 'string' || obj.name.length < 2) {
    return { valid: false, error: 'name is required and must be at least 2 characters' };
  }
  if (typeof obj.url !== 'string' && obj.url !== undefined) {
    return { valid: false, error: 'url must be a string' };
  }
  return { valid: true };
}

function validateHtmlFile(filePath: string): JsonLdValidation {
  try {
    const html = readFileSync(filePath, 'utf-8');
    const blocks = extractJsonLd(html);
    if (blocks.length === 0) {
      return { file: filePath, valid: false, error: 'No JSON-LD blocks found' };
    }
    const localBusiness = blocks.find((b) => {
      if (typeof b !== 'object' || b === null) return false;
      const obj = b as Record<string, unknown>;
      return obj['@type'] === 'LocalBusiness';
    });
    if (!localBusiness) {
      return { file: filePath, valid: false, error: 'No LocalBusiness JSON-LD block found' };
    }
    const result = validateLocalBusiness(localBusiness);
    return { file: filePath, valid: result.valid, error: result.error, hasLocalBusiness: true };
  } catch (err) {
    return { file: filePath, valid: false, error: err instanceof Error ? err.message : 'read failed' };
  }
}

function validateDirectory(dirPath: string): JsonLdValidation[] {
  const results: JsonLdValidation[] = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...validateDirectory(fullPath));
    } else if (entry.endsWith('.html')) {
      results.push(validateHtmlFile(fullPath));
    }
  }
  return results;
}

// ── Main ──
const target = process.argv[2];
if (!target) {
  console.error('Usage: npx tsx scripts/validate-jsonld.ts <path>');
  process.exit(1);
}
if (!existsSync(target)) {
  console.error(`Path not found: ${target}`);
  process.exit(1);
}

const isDir = statSync(target).isDirectory();
const results = isDir ? validateDirectory(target) : [validateHtmlFile(target)];

console.log(`\nValidating ${results.length} HTML file(s) for LocalBusiness JSON-LD...\n`);

let passed = 0;
let failed = 0;
for (const r of results) {
  const status = r.valid ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${status}  ${r.file}`);
  if (!r.valid && r.error) console.log(`           ${r.error}`);
  if (r.valid) passed++; else failed++;
}

console.log(`\n${passed} passed, ${failed} failed of ${results.length} total.\n`);

if (failed > 0) {
  console.error('❌ JSON-LD validation failed — blocking merge.');
  process.exit(1);
}
console.log('✅ All pages have valid LocalBusiness JSON-LD.');
process.exit(0);
