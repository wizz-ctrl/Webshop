interface AnalyticsEvent { event: string; userId?: string; properties?: Record<string, unknown>; timestamp: string; }
const eventBuffer: AnalyticsEvent[] = [];
const MAX_BUFFER = 200;
export function isAnalyticsEnabled(): boolean { return false; }
export async function initAnalytics(): Promise<void> { }
export function track(event: string, userId?: string, properties: Record<string, unknown> = {}): void {
  const evt: AnalyticsEvent = { event, userId, properties, timestamp: new Date().toISOString() };
  eventBuffer.push(evt);
  if (eventBuffer.length > MAX_BUFFER) eventBuffer.shift();
  console.log(`[analytics] ${event}`, userId ? `(user: ${userId.slice(0, 8)}...)` : '', properties);
}
export function identifyUser(userId: string, traits: Record<string, unknown> = {}): void { }
export function getEventBuffer(): AnalyticsEvent[] { return eventBuffer.slice(); }
export async function shutdownAnalytics(): Promise<void> { }
export function trackSignup(userId: string, plan: string = 'free'): void { track('signup', userId, { plan }); }
export function trackStepComplete(userId: string, step: number, stepName: string): void { track('step-complete', userId, { step, name: stepName }); }
export function trackGenerateStart(userId: string, siteId: string, pageCount: number): void { track('generate-start', userId, { siteId, pageCount }); }
export function trackGenerateDone(userId: string, siteId: string, pageCount: number, costUsd: number, durationMs: number): void { track('generate-done', userId, { siteId, pageCount, costUsd, durationMs }); }
export function trackGenerateFailed(userId: string, siteId: string, error: string): void { track('generate-failed', userId, { siteId, error }); }
export function trackDeployStart(userId: string, siteId: string, target: string): void { track('deploy-start', userId, { siteId, target }); }
export function trackDeployDone(userId: string, siteId: string, deployUrl: string, durationMs: number): void { track('deploy-done', userId, { siteId, deployUrl, durationMs }); }
export function trackSpendCapHit(userId: string, attemptedUsd: number, capUsd: number): void { track('spend-cap-hit', userId, { attempted: attemptedUsd, cap: capUsd }); }
export function trackPreviewOpen(userId: string, siteId: string): void { track('preview-open', userId, { siteId }); }
export function trackDownloadZip(userId: string, siteId: string): void { track('download-zip', userId, { siteId }); }
export function trackRateLimitHit(userId: string, agentName: string, endpoint: string): void { track('rate-limit-hit', userId, { agentName, endpoint }); }
