'use client';
import type { ReactNode } from 'react';
interface EmptyStateProps { icon: ReactNode; title: string; text?: string; actions?: ReactNode; }
export function EmptyState({ icon, title, text, actions }: EmptyStateProps) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">{icon}</div><div className="empty-title">{title}</div>{text&&<div className="empty-text">{text}</div>}{actions&&<div className="empty-actions">{actions}</div>}</div>;
}
