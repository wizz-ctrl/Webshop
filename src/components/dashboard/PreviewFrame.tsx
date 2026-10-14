'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowsOutSimple, ArrowsInSimple, ArrowUpRight, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { DeviceToggle, getDeviceSize, type Device } from './DeviceToggle';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

interface PreviewFrameProps {
  previewUrl: string;          // e.g. /api/sites/[id]/preview-html
  siteId: string;
  siteName: string;
  onClose?: () => void;
}

export function PreviewFrame({ previewUrl, siteId, siteName, onClose }: PreviewFrameProps) {
  const [device, setDevice] = useState<Device>('desktop');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Reset loading state when device changes (iframe reloads)
  useEffect(() => { setLoading(true); }, [device, previewUrl]);

  const size = getDeviceSize(device);

  return (
    <div className={`preview-frame ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="preview-toolbar">
        <div className="row" style={{ gap: 14 }}>
          <DeviceToggle device={device} onChange={setDevice} />
          <span className="muted" style={{ fontSize: 12 }}>
            {size.width}×{size.height}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <ArrowsInSimple size={16} aria-hidden="true" /> : <ArrowsOutSimple size={16} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => window.open(previewUrl, '_blank')}
            aria-label="Open in new tab"
            title="Open in new tab"
          >
            <ArrowUpRight size={16} aria-hidden="true" /> New tab
          </button>
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close preview"
              title="Close preview"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="preview-stage">
        {loading && (
          <div className="preview-skeleton">
            <Skeleton className="skeleton-block" style={{ width: '100%', height: 80, marginBottom: 16 }} />
            <Skeleton className="skeleton-text" style={{ width: '60%', height: 24, marginLeft: 'auto', marginRight: 'auto' }} />
            <Skeleton className="skeleton-text" style={{ width: '80%', height: 16, marginLeft: 'auto', marginRight: 'auto' }} />
            <Skeleton className="skeleton-text" style={{ width: '70%', height: 16, marginLeft: 'auto', marginRight: 'auto' }} />
          </div>
        )}
        {error && (
          <div className="preview-error">
            <p className="empty-title">Preview failed to load</p>
            <p className="empty-text">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => { setError(null); setLoading(true); if (iframeRef.current) iframeRef.current.src = previewUrl; }}>
              Retry
            </Button>
          </div>
        )}
        <div
          className={`preview-viewport ${device}`}
          style={{ width: device === 'desktop' ? '100%' : `${size.width}px`, maxWidth: '100%' }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title={`Preview of ${siteName}`}
            onLoad={() => setLoading(false)}
            onError={() => { setError('iframe failed'); setLoading(false); }}
            sandbox="allow-same-origin allow-scripts allow-forms"
            aria-label={`Preview of ${siteName}`}
            style={{ width: '100%', height: device === 'desktop' ? '80vh' : `${size.height}px`, border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
