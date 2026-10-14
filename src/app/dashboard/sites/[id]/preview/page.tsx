'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { api, ApiError } from '../../../../../lib/api/client';
import type { Site } from '../../../../../lib/api/contracts';
import { PreviewFrame } from '../../../../../components/dashboard/PreviewFrame';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { Banner } from '../../../../../components/ui/Field';

export default function SitePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    api.getSite(id)
      .then((s) => { setSite(s); setError(null); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load site.'));
  }, [id]);

  if (id === null) {
    return <div className="enter"><Skeleton className="skeleton-block" style={{ height: 60 }} /></div>;
  }
  if (error) {
    return (
      <div className="enter">
        <Banner variant="error" title="Could not load site for preview">{error}</Banner>
        <Link href={`/dashboard/sites/${id}`} className="btn btn-ghost btn-sm mt-md">
          <ArrowLeft size={14} aria-hidden="true" /> Back to site
        </Link>
      </div>
    );
  }
  if (!site) {
    return <div className="enter"><Skeleton className="skeleton-block" style={{ height: 60 }} /></div>;
  }
  if (site.status !== 'live') {
    return (
      <div className="enter">
        <Banner variant="warning" title="Site not ready for preview">
          This site is currently <strong>{site.status}</strong>. Generate it first before previewing.
        </Banner>
        <Link href={`/dashboard/sites/${id}`} className="btn btn-primary btn-sm mt-md">
          Go to site detail
        </Link>
      </div>
    );
  }

  return (
    <div className="enter">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="page-head-eyebrow">Live Preview</div>
          <h1 style={{ fontSize: 'clamp(22px, 2.6vw, 30px)' }}>{site.businessName}</h1>
          <p className="page-head-sub">{site.pageCount} pages · {site.theme} theme · {site.imageTier} image tier</p>
        </div>
        <div className="page-head-actions">
          <Link href={`/dashboard/sites/${id}`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} aria-hidden="true" /> Back to site
          </Link>
        </div>
      </div>

      <PreviewFrame
        previewUrl={api.previewSite(id)}
        siteId={id}
        siteName={site.businessName}
      />
    </div>
  );
}
