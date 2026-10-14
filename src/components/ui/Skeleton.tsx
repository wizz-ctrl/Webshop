'use client';
import type { ReactNode } from 'react';
export function Skeleton({ className='', style }: { className?: string; style?: React.CSSProperties }) { return <div className={'skeleton '+className} style={style} aria-hidden="true"/>; }
export function SkeletonText({ lines=3, className='' }: { lines?: number; className?: string }) { return <div className={className} aria-hidden="true">{Array.from({length:lines}).map((_,i) => <Skeleton key={i} className={'skeleton-text '+(i===lines-1?'sm':'')} style={{ width: i===lines-1?'60%':'100%' }}/>)}</div>; }
export function SkeletonCard() { return <div className="skeleton-card" aria-hidden="true"><Skeleton className="skeleton-block" style={{ marginBottom: 12 }}/><Skeleton className="skeleton-text lg" style={{ width: '50%' }}/><Skeleton className="skeleton-text" style={{ width: '70%' }}/></div>; }
export function SkeletonSitesGrid({ count=4 }: { count?: number }) { return <div className="sites-grid">{Array.from({length:count}).map((_,i) => <SkeletonCard key={i}/>)}</div>; }
