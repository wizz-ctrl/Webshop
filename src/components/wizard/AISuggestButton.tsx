'use client';
import { Sparkle } from '@phosphor-icons/react';
interface AISuggestButtonProps { onClick: () => void; loading?: boolean; disabled?: boolean; label?: string; helper?: string; }
export function AISuggestButton({ onClick, loading, disabled, label='Suggest with AI', helper }: AISuggestButtonProps) {
  return <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><button type="button" className="ai-suggest" onClick={onClick} disabled={loading || disabled} aria-busy={loading || undefined}>{loading ? <span className="ai-suggest-spinner" aria-hidden="true"/> : <Sparkle size={15} aria-hidden="true"/>}{loading ? 'Thinking...' : label}</button>{helper && <span className="muted" style={{ fontSize: 12 }}>{helper}</span>}</div>;
}
