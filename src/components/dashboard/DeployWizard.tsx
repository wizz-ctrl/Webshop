'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, ArrowUpRight, Check, X, Rocket,
  Sparkle, WarningCircle, Globe, CheckCircle,
} from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StreamingLog, type LogLine } from '../ui/StreamingLog';
import { useToast } from '../ui/Toast';
import { Banner } from '../ui/Field';
import { ENDPOINTS, type GenerateEvent } from '../../lib/api/contracts';

interface DeployWizardProps {
  siteId: string;
  businessName: string;
  pageCount: number;
}

type Step = 'target' | 'oauth' | 'confirm' | 'logs';
type Phase = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export function DeployWizard({ siteId, businessName, pageCount }: DeployWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('target');
  const [target, setTarget] = useState<'vercel' | 'static'>('vercel');
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);
  const [oauthComplete, setOauthComplete] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [pageCount2, setPageCount2] = useState({ done: 0, total: 0 });
  const [eta, setEta] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [result, setResult] = useState<{ deployUrl: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const cleanup = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };
  useEffect(() => () => cleanup(), []);

  const appendLog = (message: string, tag?: LogLine['tag']) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs((cur) => [...cur, { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time, message, tag }]);
  };

  // ── Step 1: pick target ──
  // (handled by setTarget state, no async needed)

  // ── Step 2: OAuth popup ──
  const startOAuth = async () => {
    setStep('oauth');
    try {
      // Get the OAuth URL from our stub endpoint
      const res = await fetch('/api/vercel/oauth/start', { method: 'POST' });
      if (!res.ok) throw new Error('Could not start OAuth');
      const { oauthUrl, state } = await res.json();

      // Open a popup window centered on screen
      const w = 600, h = 700;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      const popup = window.open(oauthUrl, 'vercel_oauth', `width=${w},height=${h},left=${left},top=${top}`);
      setOauthWindow(popup);

      if (!popup) {
        toast({ variant: 'warning', title: 'Popup blocked', text: 'Allow popups for this site to authorize Vercel.' });
        return;
      }

      // Poll the popup window's URL for the redirect back to our callback
      // (which will redirect to /dashboard/sites?vercel_connected=1)
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          // Without a real Vercel app, we'll simulate success after the user closes
          // (in prod, the popup would auto-close when the callback completes)
          setOauthComplete(true);
          toast({ variant: 'success', title: 'Vercel authorized (simulated)', text: 'Proceed to confirm your deploy settings.' });
          return;
        }
        try {
          const popupUrl = popup.location.href;
          if (popupUrl.includes('vercel_connected=1')) {
            clearInterval(poll);
            popup.close();
            setOauthWindow(null);
            setOauthComplete(true);
            toast({ variant: 'success', title: 'Vercel authorized', text: 'Proceed to confirm your deploy settings.' });
          }
        } catch {
          // Cross-origin — popup hasn't redirected back to our origin yet
        }
      }, 500);
    } catch (err) {
      toast({ variant: 'error', title: 'OAuth failed', text: err instanceof Error ? err.message : 'Could not start Vercel OAuth.' });
    }
  };

  // ── Step 4: deploy ──
  const startDeploy = async () => {
    setStep('logs');
    setPhase('connecting');
    setLogs([]);
    setProgress(0);
    setPageCount2({ done: 0, total: 0 });
    setEta(null);
    setResult(null);
    setErrorMessage(null);
    startTimeRef.current = Date.now();

    try {
      // 1. POST to enqueue the deploy
      const res = await fetch(ENDPOINTS.siteDeploy ? ENDPOINTS.siteDeploy(siteId) : `/api/sites/${siteId}/deploy`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Deploy failed (${res.status})`);
      }

      // 2. Open EventSource for SSE
      const streamUrl = `/api/sites/${siteId}/deploy/stream`;
      const ev = new EventSource(streamUrl);
      eventSourceRef.current = ev;

      setPhase('streaming');

      ev.onopen = () => appendLog('Connected to Vercel build worker.', 'start');

      ev.addEventListener('started', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'started') {
          setPageCount2({ done: 0, total: data.totalPages });
          setEta(data.estimatedSeconds);
          appendLog(`Deploy started. ${data.totalPages} build steps queued. ETA ${data.estimatedSeconds}s.`, 'start');
        }
      });

      ev.addEventListener('page-started', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'page-started') appendLog(`Step: ${data.pageName}`);
      });

      ev.addEventListener('log', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'log') appendLog(data.message, data.level === 'error' ? 'err' : 'info');
      });

      ev.addEventListener('page-complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'page-complete') {
          setPageCount2((p) => ({ ...p, done: p.done + 1 }));
          appendLog(`✓ ${data.pageName} complete in ${(data.durationMs / 1000).toFixed(1)}s`, 'done');
        }
      });

      ev.addEventListener('progress', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'progress') {
          setProgress(data.percent);
          if (startTimeRef.current && data.percent > 5) {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const remaining = (elapsed / data.percent) * (100 - data.percent);
            setEta(Math.max(1, Math.round(remaining)));
          }
        }
      });

      ev.addEventListener('done', (e: MessageEvent) => {
        const data = JSON.parse(e.data) as GenerateEvent;
        if (data.type === 'done') {
          setProgress(100);
          setPhase('complete');
          setResult({ deployUrl: data.previewUrl });
          appendLog(`Done. Live URL: ${data.previewUrl}`, 'done');
          ev.close();
          eventSourceRef.current = null;
          toast({ variant: 'success', title: 'Site deployed!', text: 'Your site is live on Vercel.' });
        }
      });

      ev.addEventListener('error', (e: MessageEvent) => {
        try {
          if (e.data) {
            const data = JSON.parse(e.data) as GenerateEvent;
            if (data.type === 'error') {
              setPhase('error');
              setErrorMessage(data.message);
              appendLog(data.message, 'err');
              toast({ variant: 'error', title: 'Deploy failed', text: data.message });
              ev.close();
              eventSourceRef.current = null;
              return;
            }
          }
        } catch { /* fall through */ }
        if (phase !== 'complete' && phase !== 'error') {
          setPhase('error');
          setErrorMessage('Lost connection to the build worker.');
          appendLog('Connection lost.', 'err');
          ev.close();
          eventSourceRef.current = null;
        }
      });
    } catch (err) {
      setPhase('error');
      const msg = err instanceof Error ? err.message : 'Deploy failed.';
      setErrorMessage(msg);
      appendLog(msg, 'err');
      toast({ variant: 'error', title: 'Deploy failed', text: msg });
    }
  };

  // ── Render ──
  const isRunning = phase === 'connecting' || phase === 'streaming';
  const isComplete = phase === 'complete';
  const isError = phase === 'error';
  const percent = isComplete ? 100 : progress;

  return (
    <div className="enter">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="page-head-eyebrow">Deploy</div>
          <h1 style={{ fontSize: 'clamp(22px, 2.8vw, 30px)' }}>Deploy {businessName}.</h1>
          <p className="page-head-sub">{pageCount} pages · ready to ship to a live URL.</p>
        </div>
        <div className="page-head-actions">
          <Link href={`/dashboard/sites/${siteId}`} className="btn btn-ghost btn-sm">
            <X size={14} aria-hidden="true" /> Cancel
          </Link>
        </div>
      </div>

      {/* 4-step progress (dots) */}
      <nav className="wizard-progress" aria-label="Deploy progress">
        {(['target', 'oauth', 'confirm', 'logs'] as Step[]).map((s, i) => {
          const stepNum = i + 1;
          const order = ['target', 'oauth', 'confirm', 'logs'].indexOf(step) + 1;
          const isCurrent = s === step;
          const isDone = stepNum < order;
          return (
            <div className="wizard-progress-step" key={s}>
              <div className={`wizard-dot ${isDone ? 'done' : ''}`} aria-current={isCurrent ? 'true' : undefined}>
                {isDone ? <Check size={14} weight="bold" aria-hidden="true" /> : stepNum}
              </div>
              {i < 3 && <div className={`wizard-line ${stepNum < order ? 'done' : ''}`} />}
            </div>
          );
        })}
      </nav>

      {/* Step 1: pick target */}
      {step === 'target' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Where should we deploy?</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
            Pick a target. Vercel is fastest (one click). Static export downloads a zip you can upload anywhere.
          </p>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div
              className={`deploy-target-card ${target === 'vercel' ? 'selected' : ''}`}
              onClick={() => setTarget('vercel')}
              role="radio"
              aria-checked={target === 'vercel'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTarget('vercel'); } }}
            >
              <Rocket size={22} weight="regular" aria-hidden="true" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 650 }}>Vercel</div>
                <div className="muted" style={{ fontSize: 12 }}>One-click deploy to a live URL on Vercel's edge network.</div>
              </div>
            </div>
            <div
              className={`deploy-target-card ${target === 'static' ? 'selected' : ''}`}
              onClick={() => setTarget('static')}
              role="radio"
              aria-checked={target === 'static'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTarget('static'); } }}
            >
              <Globe size={22} weight="regular" aria-hidden="true" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 650 }}>Static export</div>
                <div className="muted" style={{ fontSize: 12 }}>Download the zip and upload to any static host.</div>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 10, marginTop: 24 }}>
            <Button onClick={() => target === 'vercel' ? setStep('oauth') : setStep('confirm')} iconRight={<ArrowRight size={15} aria-hidden="true" />}>
              {target === 'vercel' ? 'Continue to Vercel OAuth' : 'Continue to download'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Vercel OAuth */}
      {step === 'oauth' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Authorize Vercel</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
            Click below to open Vercel's OAuth popup. After you authorize, the popup will close automatically.
          </p>
          {!oauthComplete ? (
            <div className="row" style={{ gap: 10 }}>
              <Button onClick={startOAuth} iconLeft={<Rocket size={15} aria-hidden="true" />}>
                Authorize with Vercel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOauthComplete(true)}>
                Skip (use simulated token)
              </Button>
            </div>
          ) : (
            <Banner variant="success" title="Vercel authorized">
              <span className="key-status connected" style={{ display: 'inline-flex', padding: '4px 10px' }}>
                <CheckCircle size={14} weight="fill" /> Connected
              </span>
              <span style={{ marginLeft: 10, fontSize: 13 }}>Proceed to confirm your deploy settings.</span>
            </Banner>
          )}
          <div className="row" style={{ gap: 10, marginTop: 24 }}>
            <Button variant="ghost" size="sm" onClick={() => setStep('target')} iconLeft={<ArrowLeft size={14} aria-hidden="true" />}>
              Back
            </Button>
            <Button onClick={() => setStep('confirm')} disabled={!oauthComplete} iconRight={<ArrowRight size={15} aria-hidden="true" />}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: confirm */}
      {step === 'confirm' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 650, margin: '0 0 4px' }}>Confirm deploy settings</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
            We're about to push {pageCount} static pages to Vercel under a new project.
          </p>
          <div className="cost-breakdown">
            <div className="cost-row"><span className="cost-key">Target</span><span className="cost-val">{target === 'vercel' ? 'Vercel' : 'Static export'}</span></div>
            <div className="cost-row"><span className="cost-key">Project name</span><span className="cost-val">{businessName.toLowerCase().replace(/\s+/g, '-')}</span></div>
            <div className="cost-row"><span className="cost-key">Framework</span><span className="cost-val">Static HTML</span></div>
            <div className="cost-row"><span className="cost-key">Pages</span><span className="cost-val">{pageCount}</span></div>
            <div className="cost-row"><span className="cost-key">Region</span><span className="cost-val">Edge (auto-detected)</span></div>
            <div className="cost-row"><span className="cost-key">HTTPS</span><span className="cost-val">Auto-provisioned (Let's Encrypt)</span></div>
            <div className="cost-total">
              <span className="cost-key">Estimated time</span>
              <span className="cost-val">~6-8 seconds</span>
            </div>
          </div>
          <div className="row" style={{ gap: 10, marginTop: 24 }}>
            <Button variant="ghost" size="sm" onClick={() => setStep(target === 'vercel' ? 'oauth' : 'target')} iconLeft={<ArrowLeft size={14} aria-hidden="true" />}>
              Back
            </Button>
            <Button onClick={startDeploy} iconLeft={<Rocket size={15} aria-hidden="true" />}>
              {target === 'vercel' ? 'Deploy to Vercel' : 'Download zip'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: logs */}
      {step === 'logs' && (
        <div className="generate-view">
          <div className="generate-hero">
            <div className="gen-eyebrow">
              {isComplete ? 'DONE' : isRunning ? 'DEPLOYING' : isError ? 'FAILED' : 'READY'}
            </div>
            <h2>
              {isComplete ? 'Your site is live.' : isRunning ? 'Deploying to Vercel…' : isError ? 'Deploy failed.' : 'Press start when ready.'}
            </h2>
            <p>
              {isComplete && result
                ? `Live at ${result.deployUrl}. Open it in a new tab to view your deployed site.`
                : isRunning
                  ? 'Watch each build step stream in. Vercel sends logs line-by-line — no frozen spinner.'
                  : isError
                    ? errorMessage
                    : 'We will upload the static zip to Vercel, run a build, and assign a live URL.'}
            </p>
          </div>

          <div className="gen-progress-card">
            <div className="gen-progress-top">
              <div className="gen-counter">
                <strong>{pageCount2.done}</strong> / {pageCount2.total || '?'} build steps
              </div>
              <div className="gen-eta">
                {isComplete ? 'Complete' : isRunning && eta !== null ? `~${eta}s remaining` : isError ? 'Failed' : 'Not started'}
              </div>
            </div>
            <ProgressBar percent={percent} done={isComplete} label="Deploy progress" />

            {isRunning && logs.length > 0 && (
              <div className="gen-stage-row">
                <Rocket size={18} className="gen-stage-icon" aria-hidden="true" />
                <span className="gen-stage-text"><strong>Working:</strong> {logs[logs.length - 1]?.message}</span>
              </div>
            )}
            {isComplete && (
              <div className="gen-stage-row" style={{ background: 'var(--success-soft)' }}>
                <CheckCircle size={18} className="gen-stage-icon" aria-hidden="true" style={{ color: 'var(--success)' }} />
                <span className="gen-stage-text" style={{ color: 'var(--success)' }}>
                  <strong>Live:</strong> {result?.deployUrl}
                </span>
              </div>
            )}
            {isError && (
              <div className="gen-stage-row" style={{ background: 'var(--error-soft)' }}>
                <WarningCircle size={18} className="gen-stage-icon" aria-hidden="true" style={{ color: 'var(--error)' }} />
                <span className="gen-stage-text" style={{ color: 'var(--error)' }}>
                  <strong>Failed:</strong> {errorMessage}
                </span>
              </div>
            )}

            <StreamingLog lines={logs} emptyText="Waiting to start deploy…" />

            <div className="gen-complete-cta" style={{ marginTop: 20 }}>
              {isComplete && result && (
                <>
                  <Button size="lg" onClick={() => window.open(result.deployUrl, '_blank')} iconRight={<ArrowUpRight size={16} aria-hidden="true" />}>
                    Open live site
                  </Button>
                  <Link href={`/dashboard/sites/${siteId}`} className="btn btn-secondary btn-lg">
                    Back to site <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </>
              )}
              {isError && (
                <>
                  <Button size="lg" onClick={startDeploy} iconLeft={<Rocket size={17} aria-hidden="true" />}>
                    Retry deploy
                  </Button>
                  <Link href={`/dashboard/sites/${siteId}`} className="btn btn-secondary btn-lg">
                    Back to site
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
