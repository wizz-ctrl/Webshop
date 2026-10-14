/**
 * callAgent — production wrapper with ALL debugging fixes applied:
 * - Gemini 3.8 Flash models (current as of Oct 2026)
 * - `as any` casts on JSON.stringify bodies (no TS squigglies)
 * - `responseText` instead of `text` (no shadow warnings)
 * - 503/429 retry with exponential backoff (5s → 15s → 30s)
 * - Multi-provider fallback: OpenRouter → Anthropic → OpenAI/Gemini → canned
 */

import { prisma } from './db';
import { getDevUser } from './dev-user';
import { decrypt, maskKey } from './crypto';
import { recordLedger } from './ledger';
import { rateLimitSync } from './rate-limit';
import type { z } from 'zod';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1';
const OPENAI_URL = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';

export const MODELS = {
  HAIKU: 'gemini-3.8-flash',
  SONNET: 'gemini-3.8-flash',
  GEMINI_FLASH: 'google/gemini-2.0-flash-001',
  GEMINI_IMAGE: 'google/gemini-2.0-flash-exp-image',
  GPT_IMAGE: 'openai/gpt-image-1',
} as const;

const PRICING: Record<string, { in: number; out: number }> = {
  'gemini-3.8-flash': { in: 0, out: 0 },
  'gemini-2.0-flash': { in: 0, out: 0 },
  'gemini-1.5-flash': { in: 0, out: 0 },
  'anthropic/claude-3-5-haiku-20241022': { in: 0.8, out: 4 },
  'anthropic/claude-3-5-sonnet-20241022': { in: 3, out: 15 },
};

export type AgentName = 'services-suggest' | 'locations-expand' | 'blog-titles' | 'keyword-cluster' | 'content-generate' | 'image-generate';

export interface CallAgentOptions<TOutput> {
  name: AgentName; model: string; systemPrompt: string; userPrompt: string;
  outputSchema: z.ZodType<TOutput>; fallback: () => TOutput;
  maxTokens?: number; temperature?: number; projectId?: string;
}

export interface CallAgentResult<TOutput> {
  output: TOutput; model: string; provider: 'openrouter' | 'anthropic' | 'openai' | 'fallback';
  promptTokens: number; completionTokens: number; costUsd: number; usedFallback: boolean;
}

async function getActiveKey(): Promise<{ key: string | null; source: 'db' | 'env' | 'none' }> {
  try {
    const user = await getDevUser();
    const u = await prisma.users.findUnique({ where: { id: user.id } });
    if (u?.openrouterKeyEncrypted) { try { return { key: decrypt(u.openrouterKeyEncrypted), source: 'db' }; } catch {} }
  } catch {}
  const envKey = process.env.OPENROUTER_DEV_KEY;
  if (envKey && envKey.trim()) return { key: envKey.trim(), source: 'env' };
  return { key: null, source: 'none' };
}

function estimateTokens(text: string): number { return Math.max(1, Math.ceil(text.length / 4)); }
function computeCost(model: string, pt: number, ct: number): number { const r = PRICING[model] || { in: 1, out: 5 }; return (pt * r.in + ct * r.out) / 1_000_000; }

interface ProviderCallResult { text: string; model: string; promptTokens: number; completionTokens: number; }

async function callOpenRouter(key: string, model: string, sys: string, usr: string, opts: { maxTokens?: number; temperature?: number }): Promise<ProviderCallResult> {
  const { OpenRouter } = await import('@openrouter/sdk');
  const client = new OpenRouter({ apiKey: key, httpReferer: 'https://localloop.dev', appTitle: 'LocalLoop MVP' });
  const result = await client.chat.send({ chatRequest: { model, max_tokens: opts.maxTokens ?? 1000, temperature: opts.temperature ?? 0.7, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] } as any });
  if (!('choices' in result) || !result.choices?.length) throw new Error('OpenRouter returned no choices');
  const rawContent = result.choices[0]?.message?.content;
  const responseText = typeof rawContent === 'string' ? rawContent : Array.isArray(rawContent) ? rawContent.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') : '';
  const usage = (result as any).usage;
  return { text: responseText, model: result.model || model, promptTokens: Number(usage?.prompt_tokens || usage?.promptTokens) || estimateTokens(sys + usr), completionTokens: Number(usage?.completion_tokens || usage?.completionTokens) || estimateTokens(responseText) };
}

async function callAnthropic(key: string, model: string, sys: string, usr: string, opts: { maxTokens?: number; temperature?: number }): Promise<ProviderCallResult> {
  const anthropicModel = model.replace(/^anthropic\//, '');
  const res = await fetch(`${ANTHROPIC_URL}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: anthropicModel, max_tokens: opts.maxTokens ?? 1000, temperature: opts.temperature ?? 0.7, system: sys, messages: [{ role: 'user', content: usr }] } as any) });
  if (!res.ok) { const b = await res.text().catch(() => ''); throw new Error(`Anthropic ${res.status}: ${b.slice(0, 200)}`); }
  const data = await res.json() as any;
  const responseText = (data?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
  const usage = data?.usage || {};
  return { text: responseText, model: anthropicModel, promptTokens: Number(usage.input_tokens) || estimateTokens(sys + usr), completionTokens: Number(usage.output_tokens) || estimateTokens(responseText) };
}

async function callOpenAI(key: string, model: string, sys: string, usr: string, opts: { maxTokens?: number; temperature?: number }): Promise<ProviderCallResult> {
  const MAX_RETRIES = 3;
  const BACKOFF_MS = [5_000, 15_000, 30_000];
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${OPENAI_URL}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify({ model, max_tokens: opts.maxTokens ?? 1000, temperature: opts.temperature ?? 0.7, top_p: 1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }] } as any) });
    if (res.ok) {
      const data = await res.json() as any;
      const responseText = data?.choices?.[0]?.message?.content || '';
      const usage = data?.usage || {};
      return { text: responseText, model: data?.model || model, promptTokens: Number(usage.prompt_tokens) || estimateTokens(sys + usr), completionTokens: Number(usage.completion_tokens) || estimateTokens(responseText) };
    }
    const errBody = await res.text().catch(() => '');
    const errMsg = `OpenAI-compatible ${res.status}: ${errBody.slice(0, 200)}`;
    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      const waitMs = res.status === 429 ? 30_000 : BACKOFF_MS[attempt];
      console.warn(`[callOpenAI] ${res.status} — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(errMsg);
      continue;
    }
    throw new Error(errMsg);
  }
  throw lastError || new Error('OpenAI-compatible call failed after retries');
}

function parseAndValidate<TOutput>(text: string, schema: z.ZodType<TOutput>): TOutput {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); if (!match) throw new Error('No JSON found in LLM response'); parsed = JSON.parse(match[1]); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new Error(`Schema validation failed: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return result.data;
}

export async function callAgent<TOutput>(opts: CallAgentOptions<TOutput>): Promise<CallAgentResult<TOutput>> {
  const user = await getDevUser();
  const rl = rateLimitSync(user.id, opts.name);
  if (!rl.ok) throw new Error(`Rate limit exceeded for ${opts.name}. Try again in ${Math.ceil(rl.resetMs / 1000)}s.`);
  const { key, source } = await getActiveKey();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Try OpenRouter
  if (key && source !== 'none') {
    try {
      const result = await callOpenRouter(key, opts.model, opts.systemPrompt, opts.userPrompt, opts);
      try { const output = parseAndValidate(result.text, opts.outputSchema); const costUsd = computeCost(result.model, result.promptTokens, result.completionTokens); await recordLedger({ step: opts.name, model: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, projectId: opts.projectId }); return { output, model: result.model, provider: 'openrouter', promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, usedFallback: false }; } catch (e) { console.warn(`[callAgent:${opts.name}] OpenRouter validation failed:`, e instanceof Error ? e.message : e); }
    } catch (e) { console.warn(`[callAgent:${opts.name}] OpenRouter call failed:`, e instanceof Error ? e.message : e); }
  }

  // Try Anthropic
  if (anthropicKey) {
    try {
      const result = await callAnthropic(anthropicKey, opts.model, opts.systemPrompt, opts.userPrompt, opts);
      try { const output = parseAndValidate(result.text, opts.outputSchema); const costUsd = computeCost(result.model, result.promptTokens, result.completionTokens); await recordLedger({ step: opts.name, model: `anthropic-direct/${result.model}`, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, projectId: opts.projectId }); return { output, model: result.model, provider: 'anthropic', promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, usedFallback: true }; } catch (e) { console.warn(`[callAgent:${opts.name}] Anthropic validation failed:`, e instanceof Error ? e.message : e); }
    } catch (e) { console.warn(`[callAgent:${opts.name}] Anthropic call failed:`, e instanceof Error ? e.message : e); }
  }

  // Try OpenAI-compatible (Gemini/Groq/OpenAI)
  if (openaiKey) {
    try {
      const result = await callOpenAI(openaiKey, opts.model, opts.systemPrompt, opts.userPrompt, opts);
      try { const output = parseAndValidate(result.text, opts.outputSchema); const costUsd = computeCost(result.model, result.promptTokens, result.completionTokens); const providerName = process.env.OPENAI_API_BASE?.includes('generativelanguage') ? 'gemini' : process.env.OPENAI_API_BASE?.includes('groq') ? 'groq' : 'openai'; await recordLedger({ step: opts.name, model: `${providerName}/${result.model}`, promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, projectId: opts.projectId }); return { output, model: result.model, provider: 'openai', promptTokens: result.promptTokens, completionTokens: result.completionTokens, costUsd, usedFallback: true }; } catch (e) { console.warn(`[callAgent:${opts.name}] OpenAI-compatible validation failed:`, e instanceof Error ? e.message : e); }
    } catch (e) { console.warn(`[callAgent:${opts.name}] OpenAI-compatible call failed:`, e instanceof Error ? e.message : e); }
  }

  // Fallback
  const output = opts.fallback();
  await recordLedger({ step: opts.name, model: opts.model, promptTokens: estimateTokens(opts.systemPrompt + opts.userPrompt), completionTokens: 0, costUsd: 0, projectId: opts.projectId });
  return { output, model: opts.model, provider: 'fallback', promptTokens: estimateTokens(opts.systemPrompt + opts.userPrompt), completionTokens: 0, costUsd: 0, usedFallback: true };
}
