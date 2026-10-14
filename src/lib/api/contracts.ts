/**
 * API contracts — typed stubs for all Route Handlers.
 * Frontend and backend both import from here.
 */

export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BasicInfo {
  businessName: string;
  niche: string;
  tagline: string;
  tone: 'friendly' | 'professional' | 'expert' | 'playful';
}

export interface Service { id: string; name: string; aiGenerated: boolean; }
export interface Location { id: string; name: string; strategy: 'neighborhoods' | 'nearby-cities'; aiGenerated: boolean; }
export interface BlogTitle { id: string; title: string; aiGenerated: boolean; }
export type KeywordTier = 'primary' | 'secondary' | 'longtail';
export interface KeywordCluster { pageType: string; primary: string[]; secondary: string[]; longtail: string[]; }
export interface ThemeChoice { id: string; name: string; vertical: string; image: string; }
export type ImageTier = 'budget' | 'standard' | 'premium';

export interface WizardState {
  projectId: string | null;
  currentStep: StepId;
  basicInfo: Partial<BasicInfo>;
  services: Service[];
  locations: Location[];
  blogTitles: BlogTitle[];
  keywords: KeywordCluster[];
  themeId: string | null;
  imageTier: ImageTier;
  spendLimit?: number;
}

export interface SuggestServicesResponse { services: string[]; }
export interface SuggestLocationsResponse { locations: string[]; }
export interface SuggestBlogTitlesResponse { titles: string[]; }
export interface GenerateKeywordsResponse { clusters: KeywordCluster[]; }

export interface Site {
  id: string;
  projectId: string;
  businessName: string;
  theme: string;
  imageTier: ImageTier;
  status: 'draft' | 'live' | 'generating' | 'failed';
  deployUrl: string | null;
  costUsd: number;
  generatedAt: string | null;
  pageCount: number;
}

export type GenerateEvent =
  | { type: 'started'; totalPages: number; estimatedSeconds: number }
  | { type: 'page-started'; page: number; pageName: string }
  | { type: 'page-complete'; page: number; pageName: string; durationMs: number }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'progress'; page: number; totalPages: number; percent: number }
  | { type: 'done'; siteId: string; totalPages: number; totalCostUsd: number; previewUrl: string }
  | { type: 'error'; message: string; retryable: boolean };

export interface KeyStatus {
  state: 'missing' | 'connected' | 'invalid';
  balanceUsd?: number;
  message?: string;
}

export interface LedgerEntry {
  id: string;
  step: string;
  model: string;
  costUsd: number;
  createdAt: string;
}

export const ENDPOINTS = {
  wizardStep: (projectId: string, stepId: StepId) => `/api/wizard/${projectId}/step/${stepId}`,
  suggestServices: '/api/ai/suggest-services',
  suggestLocations: '/api/ai/suggest-locations',
  suggestBlogTitles: '/api/ai/suggest-blog-titles',
  generateKeywords: '/api/ai/generate-keywords',
  openRouterKey: '/api/user/openrouter-key',
  testKey: '/api/user/openrouter-key/test',
  sites: '/api/sites',
  site: (id: string) => `/api/sites/${id}`,
  siteGenerate: (id: string) => `/api/sites/${id}/generate`,
  siteStream: (id: string) => `/api/sites/${id}/stream`,
  siteDownload: (id: string) => `/api/sites/${id}/download`,
  sitePreview: (id: string) => `/api/sites/${id}/preview-html`,
  siteDeploy: (id: string) => `/api/sites/${id}/deploy`,
  ledger: '/api/user/ledger',
} as const;
