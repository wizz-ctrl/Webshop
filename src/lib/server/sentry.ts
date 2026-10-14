export function isSentryEnabled(): boolean { return false; }
export async function initSentry(): Promise<void> { }
export function captureException(err: unknown, context: any = {}): void { console.error('[captureException]', err, context); }
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context: any = {}): void { if (level === 'error') console.error('[captureMessage]', message, context); else console.log(`[${level}] ${message}`, context); }
export function addBreadcrumb(message: string, level: 'info' | 'warning' | 'error' = 'info', data?: any): void { }
