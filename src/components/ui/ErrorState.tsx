'use client';

import type { ReactNode } from 'react';
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  message?: string;
  /** Show a retry button — pass the retry handler */
  onRetry?: () => void;
  retryLabel?: string;
  /** Optional extra actions (e.g. "Back to dashboard" link) */
  actions?: ReactNode;
  /** Severity — affects color + icon */
  variant?: 'error' | 'warning';
  /** Compact mode for inline errors (vs full-page) */
  compact?: boolean;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  actions,
  variant = 'error',
  compact = false,
}: ErrorStateProps) {
  const Icon = variant === 'warning' ? WarningCircle : WarningCircle;
  const iconColor = variant === 'warning' ? 'var(--warning)' : 'var(--error)';
  const bg = variant === 'warning' ? 'var(--warning-soft)' : 'var(--error-soft)';

  return (
    <div className={`error-state ${compact ? 'compact' : ''}`} style={{ background: bg }} role="alert">
      <div className="error-state-icon" style={{ color: iconColor }}>
        <Icon size={compact ? 20 : 28} weight="fill" aria-hidden="true" />
      </div>
      <div className="error-state-body">
        <div className="error-state-title" style={{ color: iconColor }}>{title}</div>
        {message && <div className="error-state-message">{message}</div>}
        {(onRetry || actions) && (
          <div className="error-state-actions">
            {onRetry && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                iconLeft={<ArrowClockwise size={14} aria-hidden="true" />}
              >
                {retryLabel}
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface LoadingStateProps {
  /** Compact = single line of skeletons. Full = card grid. */
  variant?: 'card' | 'list' | 'grid' | 'inline';
  count?: number;
  label?: string;
}

export function LoadingState({ variant = 'card', count = 3, label }: LoadingStateProps) {
  if (label) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="ai-suggest-spinner" aria-hidden="true" />
        <span className="muted">{label}</span>
      </div>
    );
  }
  if (variant === 'inline') {
    return (
      <div className="loading-state" role="status" aria-live="polite" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <div className="ai-suggest-spinner" aria-hidden="true" />
        <span className="muted" style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div role="status" aria-live="polite" aria-label="Loading list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: 8 }}>
            <div className="skeleton skeleton-text lg" style={{ width: '50%', marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'grid') {
    return (
      <div className="sites-grid" role="status" aria-live="polite" aria-label="Loading grid">
        {Array.from({ length: count }).map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton skeleton-block" style={{ marginBottom: 12 }} />
            <div className="skeleton skeleton-text lg" style={{ width: '60%' }} />
            <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }
  // card (default)
  return (
    <div className="card" role="status" aria-live="polite" aria-label="Loading">
      <div className="skeleton skeleton-block" style={{ marginBottom: 12 }} />
      <div className="skeleton skeleton-text lg" style={{ width: '50%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 4 }} />
      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
    </div>
  );
}

/**
 * Async boundary — handles the loading/empty/error triad for any
 * data-fetching component. Use this to wrap any client component that
 * fetches data on mount.
 *
 * Usage:
 *   <AsyncBoundary
 *     loading={sites === null}
 *     error={error}
 *     empty={sites?.length === 0}
 *     onRetry={() => refetch()}
 *     emptyState={<EmptyState ... />}
 *   >
 *     {sites && <SitesGrid sites={sites} />}
 *   </AsyncBoundary>
 */
interface AsyncBoundaryProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry?: () => void;
  emptyState: ReactNode;
  children: ReactNode;
  loadingVariant?: LoadingStateProps['variant'];
  loadingLabel?: string;
}

export function AsyncBoundary({
  loading,
  error,
  empty,
  onRetry,
  emptyState,
  children,
  loadingVariant = 'card',
  loadingLabel,
}: AsyncBoundaryProps) {
  if (loading) return <LoadingState variant={loadingVariant} label={loadingLabel} />;
  if (error) return <ErrorState title="Something went wrong" message={error} onRetry={onRetry} />;
  if (empty) return <>{emptyState}</>;
  return <>{children}</>;
}
