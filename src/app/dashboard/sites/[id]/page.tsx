'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowUpRight, Download, CheckCircle, Clock,
  FileHtml, Rocket, Eye, WarningCircle,
} from '@phosphor-icons/react';
import { api, ApiError } from '../../../../lib/api/client';
import type { Site } from '../../../../lib/api/contracts';
import { Skeleton, SkeletonText } from '../../../../components/ui/Skeleton';
import { Banner } from '../../../../components/ui/Field';
import { useToast } from '../../../../components/ui/Toast';

type Tab = 'overview' | 'pages' | 'settings' | 'deployments';

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getSite(id)
      .then((s) => { setSite(s); setError(null); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load site.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !site) {
    return (
      <div className="enter">
        <div className="card"><Skeleton className="skeleton-block" /><SkeletonText lines={4} /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="enter">
        <Banner variant="error" title="Could not load site">{error}</Banner>
        <Link href="/dashboard/sites" className="btn btn-ghost btn-sm mt-md">
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </Link>
      </div>
    );
  }

  const statusPill = site.status === 'live'
    ? <span className="key-status connected"><CheckCircle size={16} weight="fill" /> Live</span>
    : site.status === 'generating'
      ? <span className="key-status missing"><Clock size={16} /> Generating</span>
      : site.status === 'failed'
        ? <span className="key-status invalid"><WarningCircle size={16} weight="fill" /> Failed</span>
        : <span className="key-status missing"><Clock size={16} /> Draft</span>;

  return (
    <div className="enter">
      <div className="page-head">
        <div>
          <div className="page-head-eyebrow">Site Details</div>
          <h1>{site.businessName}</h1>
          <p className="page-head-sub">{site.pageCount} pages · {site.theme} theme · {site.imageTier} image tier</p>
        </div>
        <div className="page-head-actions">
          <Link href="/dashboard/sites" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </Link>
        </div>
      </div>

      <div className="tab-bar" role="tablist" aria-label="Site detail tabs">
        <button role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}>Overview</button>
        <button role="tab" aria-selected={tab === 'pages'} onClick={() => setTab('pages')}>Pages</button>
        <button role="tab" aria-selected={tab === 'settings'} onClick={() => setTab('settings')}>Settings</button>
        <button role="tab" aria-selected={tab === 'deployments'} onClick={() => setTab('deployments')}>Deployments</button>
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="row between mb-md">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Generation status</h3>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                {site.status === 'live' && 'Live and ready for preview or deployment.'}
                {site.status === 'draft' && 'Draft — not yet generated.'}
                {site.status === 'generating' && 'Generating pages now…'}
                {site.status === 'failed' && 'Generation failed.'}
              </p>
            </div>
            {statusPill}
          </div>
          <div className="divider" />
          <div className="row between" style={{ padding: '8px 0' }}>
            <span className="muted" style={{ fontSize: 14 }}>Site ID</span>
            <code className="mono" style={{ fontSize: 12 }}>{site.id}</code>
          </div>
          <div className="row between" style={{ padding: '8px 0' }}>
            <span className="muted" style={{ fontSize: 14 }}>Pages generated</span>
            <strong style={{ fontSize: 14 }}>{site.pageCount}</strong>
          </div>
          <div className="row between" style={{ padding: '8px 0' }}>
            <span className="muted" style={{ fontSize: 14 }}>Total AI cost</span>
            <strong style={{ fontSize: 14 }} className="text-accent">{'$' + site.costUsd.toFixed(4)}</strong>
          </div>
          <div className="row between" style={{ padding: '8px 0' }}>
            <span className="muted" style={{ fontSize: 14 }}>Generated at</span>
            <strong style={{ fontSize: 14 }}>{site.generatedAt ? new Date(site.generatedAt).toLocaleString() : '—'}</strong>
          </div>
          <div className="row between" style={{ padding: '8px 0' }}>
            <span className="muted" style={{ fontSize: 14 }}>Deploy URL</span>
            <strong style={{ fontSize: 14 }}>{site.deployUrl ? <a href={site.deployUrl} target="_blank" rel="noreferrer" className="text-link">{site.deployUrl}</a> : 'Not deployed yet'}</strong>
          </div>
          <div className="row mt-lg" style={{ gap: 10, flexWrap: 'wrap' }}>
            {site.status === 'live' && (
              <Link href={'/dashboard/sites/' + site.id + '/preview'} className="btn btn-primary btn-sm">
                <Eye size={15} aria-hidden="true" /> Preview site
              </Link>
            )}
            <Link href={'/dashboard/sites/' + site.id + '/deploy'} className="btn btn-secondary btn-sm">
              <Rocket size={15} aria-hidden="true" /> Deploy to Vercel
            </Link>
            <a href={api.downloadSite(site.id)} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <Download size={15} aria-hidden="true" /> Download zip
            </a>
          </div>
        </div>
      )}

      {tab === 'pages' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Pages in this site</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>{site.pageCount} pages generated with LocalBusiness JSON-LD.</p>
          {site.status === 'live' ? (
            <div className="page-list">
              {Array.from({ length: site.pageCount }).map((_, i) => {
                const slug = i === 0 ? 'index' : 'page-' + (i + 1);
                return (
                  <a key={i} href={api.previewSite(site.id)} target="_blank" rel="noreferrer" className="page-list-item" style={{ textDecoration: 'none' }}>
                    <FileHtml size={18} weight="regular" aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Page {i + 1}</div>
                      <div className="muted" style={{ fontSize: 12 }}>/{slug}.html</div>
                    </div>
                    <ArrowUpRight size={14} aria-hidden="true" style={{ color: 'var(--text-subtle)' }} />
                  </a>
                );
              })}
            </div>
          ) : (
            <Banner variant="info" title="Pages not available">Generate the site first to see its page list.</Banner>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Site settings</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>Rename, change theme, or update image tier — coming in v1.0.</p>
          <Banner variant="info" title="Coming in v1.0">Inline edit-per-section + theme swap will land with the visual editor.</Banner>
        </div>
      )}

      {tab === 'deployments' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Deployments</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>Vercel and static export targets appear here after you run the deploy wizard.</p>
          {site.deployUrl ? (
            <div className="deploy-row">
              <div className="row" style={{ gap: 10 }}>
                <span className="deploy-status-dot live" aria-hidden="true" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{site.deployUrl}</div>
                  <div className="muted" style={{ fontSize: 12 }}>Deployed {site.generatedAt ? new Date(site.generatedAt).toLocaleString() : '—'}</div>
                </div>
              </div>
              <a href={site.deployUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                <ArrowUpRight size={14} aria-hidden="true" /> Visit
              </a>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-icon"><Rocket size={26} aria-hidden="true" /></div>
              <div className="empty-title">No deployments yet</div>
              <div className="empty-text">Deploy this site to Vercel or download the static zip.</div>
              <Link href={'/dashboard/sites/' + site.id + '/deploy'} className="btn btn-primary btn-sm mt-sm">
                <Rocket size={15} aria-hidden="true" /> Deploy now
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
