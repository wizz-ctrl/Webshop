'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { api, ApiError } from '../../../../../lib/api/client';
import type { Site } from '../../../../../lib/api/contracts';
import { DeployWizard } from '../../../../../components/dashboard/DeployWizard';
import { Skeleton, SkeletonText } from '../../../../../components/ui/Skeleton';
import { Banner } from '../../../../../components/ui/Field';

export default function SiteDeployPage({ params }: { params: Promise<{ id: string }> }) {
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
    return <div className="enter"><SkeletonText lines={3} /></div>;
  }
  if (error) {
    return (
      <div className="enter">
        <Banner variant="error" title="Could not load site">{error}</Banner>
        <Link href={`/dashboard/sites/${id}`} className="btn btn-ghost btn-sm mt-md">
          <ArrowLeft size={14} aria-hidden="true" /> Back to site
        </Link>
      </div>
    );
  }
  if (!site) {
    return (
      <div className="enter">
        <div className="card">
          <Skeleton className="skeleton-block" />
          <SkeletonText lines={3} />
        </div>
      </div>
    );
  }
  if (site.status !== 'live') {
    return (
      <div className="enter">
        <Banner variant="warning" title="Site not ready to deploy">
          This site is currently <strong>{site.status}</strong>. Generate it first before deploying.
        </Banner>
        <Link href={`/dashboard/sites/${id}`} className="btn btn-primary btn-sm mt-md">
          Go to site detail
        </Link>
      </div>
    );
  }

  return <DeployWizard siteId={site.id} businessName={site.businessName} pageCount={site.pageCount} />;
}
