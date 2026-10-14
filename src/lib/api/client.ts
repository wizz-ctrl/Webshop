/**
 * Fetch wrappers — all backend calls from the frontend go through here.
 */
import { ENDPOINTS, type SuggestServicesResponse, type SuggestLocationsResponse, type SuggestBlogTitlesResponse, type GenerateKeywordsResponse, type Site, type KeyStatus, type LedgerEntry, type WizardState, type StepId } from './contracts';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; this.name = 'ApiError'; }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body?.error) message = body.error; else if (body?.message) message = body.message; } catch {}
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  saveStep: async (projectId: string, stepId: StepId, data: Partial<WizardState>) => request<{ ok: true }>(ENDPOINTS.wizardStep(projectId, stepId), { method: 'POST', body: JSON.stringify(data) }),
  loadStep: async (projectId: string, stepId: StepId) => request<Partial<WizardState>>(ENDPOINTS.wizardStep(projectId, stepId)),
  suggestServices: async (niche: string, businessName: string) => request<SuggestServicesResponse>(ENDPOINTS.suggestServices, { method: 'POST', body: JSON.stringify({ niche, businessName }) }),
  suggestLocations: async (niche: string, city: string) => request<SuggestLocationsResponse>(ENDPOINTS.suggestLocations, { method: 'POST', body: JSON.stringify({ niche, city }) }),
  suggestBlogTitles: async (niche: string, services: string[]) => request<SuggestBlogTitlesResponse>(ENDPOINTS.suggestBlogTitles, { method: 'POST', body: JSON.stringify({ niche, services }) }),
  generateKeywords: async (basicInfo: { businessName: string; niche: string; services: string[]; locations: string[]; blogTitles: string[] }) => request<GenerateKeywordsResponse>(ENDPOINTS.generateKeywords, { method: 'POST', body: JSON.stringify(basicInfo) }),
  saveOpenRouterKey: async (key: string) => request<{ ok: true }>(ENDPOINTS.openRouterKey, { method: 'POST', body: JSON.stringify({ key }) }),
  testOpenRouterKey: async () => request<KeyStatus>(ENDPOINTS.testKey, { method: 'POST' }),
  getKeyStatus: async () => request<KeyStatus>(ENDPOINTS.openRouterKey),
  listSites: async () => request<Site[]>(ENDPOINTS.sites),
  getSite: async (id: string) => request<Site>(ENDPOINTS.site(id)),
  createSite: async (wizardState: WizardState) => request<Site>(ENDPOINTS.sites, { method: 'POST', body: JSON.stringify(wizardState) }),
  deleteSite: async (id: string) => request<{ ok: true }>(ENDPOINTS.site(id), { method: 'DELETE' }),
  downloadSite: (id: string) => ENDPOINTS.siteDownload(id),
  previewSite: (id: string) => ENDPOINTS.sitePreview(id),
  getLedger: async () => request<LedgerEntry[]>(ENDPOINTS.ledger),
};
