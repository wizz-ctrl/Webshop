'use client';
interface ProgressBarProps { percent: number; done?: boolean; label?: string; }
export function ProgressBar({ percent, done, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return <div><div className="gen-progress-bar-track" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100} aria-label={label||'Progress'}><div className={'gen-progress-bar-fill'+(done?' done':'')} style={{ width: clamped+'%' }}/></div></div>;
}
