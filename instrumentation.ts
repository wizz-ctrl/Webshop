/**
 * Next.js instrumentation hook — auto-loaded on server startup.
 * Initializes Sentry + analytics. No-op if env vars aren't set.
 *
 * Path note: this file is at project root, so imports use ./src/lib/...
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initSentry } = await import('./src/lib/server/sentry');
      await initSentry();
    } catch (err) {
      console.warn('[instrumentation] Sentry init skipped:', err instanceof Error ? err.message : err);
    }
    try {
      const { initAnalytics } = await import('./src/lib/server/analytics');
      await initAnalytics();
    } catch (err) {
      console.warn('[instrumentation] Analytics init skipped:', err instanceof Error ? err.message : err);
    }
  }
}
