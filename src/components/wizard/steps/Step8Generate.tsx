'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CheckCircle, Sparkle, WarningCircle, Globe } from '@phosphor-icons/react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardAside } from '../WizardShell';
import { Button } from '../../ui/Button';
import { ProgressBar } from '../../ui/ProgressBar';
import { StreamingLog, type LogLine } from '../../ui/StreamingLog';
import { useToast } from '../../ui/Toast';
import { ENDPOINTS, type GenerateEvent } from '../../../lib/api/contracts';
type Phase = 'idle'|'connecting'|'streaming'|'complete'|'error';
export function Step8Generate() {
  const wizard = useWizardStore();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState({ done: 0, total: 0 });
  const [eta, setEta] = useState<number|null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [result, setResult] = useState<{ siteId: string; previewUrl: string; cost: number }|null>(null);
  const [errorMessage, setErrorMessage] = useState<string|null>(null);
  const esRef = useRef<EventSource|null>(null);
  const startRef = useRef<number|null>(null);
  const costSoFar = useMemo(() => { const pages = (wizard.services.length+wizard.locations.length+wizard.blogTitles.length+4); return pages*0.003+wizard.services.length*0.0003+wizard.locations.length*0.0004+wizard.blogTitles.length*0.0002+0.04*8; }, [wizard.services.length, wizard.locations.length, wizard.blogTitles.length]);
  useEffect(() => () => { esRef.current?.close(); esRef.current = null; }, []);
  const appendLog = (message: string, tag?: LogLine['tag']) => { const now = new Date(); const time = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0'); setLogs((cur) => [...cur, { id: 'log_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), time, message, tag }]); };
  const startGeneration = async () => {
    if (!wizard.basicInfo.businessName || !wizard.basicInfo.niche || wizard.services.length===0 || !wizard.themeId) { toast({ variant:'warning', title:'Brief is incomplete.' }); return; }
    setPhase('connecting'); setLogs([]); setProgress(0); setPageCount({done:0,total:0}); setEta(null); setResult(null); setErrorMessage(null); startRef.current = Date.now();
    try {
      const cr = await fetch(ENDPOINTS.sites, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(wizard) });
      if (!cr.ok) { const b = await cr.json().catch(()=>({})); throw new Error(b?.error||'Create failed ('+cr.status+')'); }
      const site = await cr.json(); const siteId = site.id;
      const gr = await fetch(ENDPOINTS.siteGenerate(siteId), { method:'POST' });
      if (!gr.ok) { const b = await gr.json().catch(()=>({})); throw new Error(b?.error||'Generate failed ('+gr.status+')'); }
      setPhase('streaming'); const ev = new EventSource(ENDPOINTS.siteStream(siteId)); esRef.current = ev;
      ev.onopen = () => appendLog('Connected to generation worker.', 'start');
      ev.addEventListener('started', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='started') { setPageCount({done:0,total:d.totalPages}); setEta(d.estimatedSeconds); appendLog('Generation started. '+d.totalPages+' pages queued. ETA '+d.estimatedSeconds+'s.', 'start'); } });
      ev.addEventListener('page-started', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='page-started') appendLog('Generating page '+d.page+'/'+pageCount.total||'?'+': '+d.pageName); });
      ev.addEventListener('page-complete', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='page-complete') { setPageCount((p)=>({...p,done:p.done+1})); appendLog('Done: '+d.pageName+' ('+(d.durationMs/1000).toFixed(1)+'s)', 'done'); } });
      ev.addEventListener('progress', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='progress') { setProgress(d.percent); if (startRef.current && d.percent>5) { const el = (Date.now()-startRef.current)/1000; const rem = (el/d.percent)*(100-d.percent); setEta(Math.max(1,Math.round(rem))); } } });
      ev.addEventListener('log', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='log') appendLog(d.message, d.level==='error'?'err':'info'); });
      ev.addEventListener('done', (e: MessageEvent) => { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='done') { setProgress(100); setPhase('complete'); setResult({siteId:d.siteId,previewUrl:d.previewUrl,cost:d.totalCostUsd}); appendLog('Done. '+d.totalPages+' pages generated. Cost: $'+d.totalCostUsd.toFixed(4)+'.', 'done'); ev.close(); esRef.current=null; toast({variant:'success',title:'Site generated!'}); } });
      ev.addEventListener('error', (e: MessageEvent) => { try { if (e.data) { const d = JSON.parse(e.data) as GenerateEvent; if (d.type==='error') { setPhase('error'); setErrorMessage(d.message); appendLog(d.message,'err'); ev.close(); esRef.current=null; return; } } } catch {} if (phase!=='complete'&&phase!=='error') { setPhase('error'); setErrorMessage('Connection lost.'); appendLog('Connection lost.','err'); ev.close(); esRef.current=null; } });
    } catch (err) { setPhase('error'); const msg = err instanceof Error ? err.message : 'Generation could not start.'; setErrorMessage(msg); appendLog(msg,'err'); toast({variant:'error',title:'Generation failed',text:msg}); }
  };
  const isRunning = phase==='connecting'||phase==='streaming'; const isComplete = phase==='complete'; const isError = phase==='error'; const percent = isComplete?100:progress;
  return <div className="enter"><div className="page-head" style={{ marginBottom: 18 }}><div><div className="page-head-eyebrow">Step 8 of 8</div><h1 style={{ fontSize: 'clamp(26px, 3vw, 34px)' }}>Generate your site.</h1><p className="page-head-sub">Watch each page stream in. The artifact is yours forever.</p></div></div><div className="wizard-shell"><div className="wizard-main"><div className="generate-view"><div className="generate-hero"><div className="gen-eyebrow">{isComplete?'DONE':isRunning?'GENERATING':isError?'FAILED':'READY'}</div><h2>{isComplete?'Your site is ready.':isRunning?'Building your pages...':isError?'Something went wrong.':'Press start when ready.'}</h2><p>{isComplete?pageCount.total+' pages generated. Cost: $'+(result?.cost||0).toFixed(4):isRunning?'Pages stream in one at a time.':isError?errorMessage||'':'We will generate your pages with AI.'}</p></div><div className="gen-progress-card"><div className="gen-progress-top"><div className="gen-counter"><strong>{pageCount.done}</strong> / {pageCount.total||'?'} pages</div><div className="gen-eta">{isComplete?'Complete':isRunning&&eta!==null?'~'+eta+'s remaining':isError?'Failed':'Not started'}</div></div><ProgressBar percent={percent} done={isComplete} label="Site generation progress" />{isRunning && logs.length>0 && <div className="gen-stage-row"><Sparkle size={18} className="gen-stage-icon" aria-hidden="true" /><span className="gen-stage-text"><strong>Working:</strong> {logs[logs.length-1]?.message}</span></div>}{isComplete && <div className="gen-stage-row" style={{ background: 'var(--success-soft)' }}><CheckCircle size={18} className="gen-stage-icon" aria-hidden="true" style={{ color: 'var(--success)' }} /><span className="gen-stage-text" style={{ color: 'var(--success)' }}><strong>Success:</strong> Your site is saved.</span></div>}{isError && <div className="gen-stage-row" style={{ background: 'var(--error-soft)' }}><WarningCircle size={18} className="gen-stage-icon" aria-hidden="true" style={{ color: 'var(--error)' }} /><span className="gen-stage-text" style={{ color: 'var(--error)' }}><strong>Failed:</strong> {errorMessage}</span></div>}<StreamingLog lines={logs} /><div className="gen-complete-cta" style={{ marginTop: 20 }}>{phase==='idle' && <Button size="lg" onClick={startGeneration} iconLeft={<Sparkle size={17} aria-hidden="true"/>}>Start generation</Button>}{isRunning && <Button size="lg" variant="secondary" disabled loading>Generating...</Button>}{isComplete && result && <><Button size="lg" variant="secondary" onClick={()=>window.open(result.previewUrl,'_blank')} iconRight={<ArrowUpRight size={16} aria-hidden="true"/>}>Preview site</Button><Link href={'/dashboard/sites/'+result.siteId} className="btn btn-primary btn-lg">View in dashboard <ArrowRight size={16} aria-hidden="true"/></Link></>}{isError && <><Button size="lg" onClick={startGeneration} iconLeft={<Sparkle size={17} aria-hidden="true"/>}>Retry generation</Button><Link href="/dashboard/sites" className="btn btn-secondary btn-lg"><Globe size={16} aria-hidden="true"/> Back to sites</Link></>}</div></div></div></div><aside className="wizard-aside"><WizardAside businessName={wizard.basicInfo.businessName} niche={wizard.basicInfo.niche} servicesCount={wizard.services.length} locationsCount={wizard.locations.length} blogCount={wizard.blogTitles.length} theme={wizard.themeId||undefined} imageTier={wizard.imageTier} costSoFar={costSoFar} /></aside></div></div>;
}
