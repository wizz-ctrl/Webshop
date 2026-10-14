'use client';
import { useEffect, useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside } from '../WizardShell';
import { AISuggestButton } from '../AISuggestButton';
import { Field, Input } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { api, ApiError } from '../../../lib/api/client';
const CPT = ['Home','About','Contact','Privacy'];
export function Step5Keywords() {
  const { basicInfo, services, locations, blogTitles, keywords, setKeywords, selectedPageIndex, setSelectedPage, updateKeyword, themeId, imageTier } = useWizardStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const allPages = [...CPT, ...services.map((s)=>s.name), ...locations.map((l)=>l.name+' Area'), ...blogTitles.map((b)=>b.title)];
  useEffect(() => { if (keywords.length !== allPages.length) { const ex = new Map(keywords.map((c)=>[c.pageType,c])); setKeywords(allPages.map((p)=>ex.get(p)||{pageType:p,primary:[],secondary:[],longtail:[]})); } }, [services.length, locations.length, blogTitles.length]);
  const handleGenerate = async () => {
    if (!basicInfo.businessName || !basicInfo.niche || services.length===0) { toast({ variant: 'warning', title: 'Complete Step 1 and Step 2 first.' }); return; }
    setLoading(true);
    try { const res = await api.generateKeywords({ businessName: basicInfo.businessName, niche: basicInfo.niche, services: services.map((s)=>s.name), locations: locations.map((l)=>l.name), blogTitles: blogTitles.map((b)=>b.title) }); const merged = allPages.map((p, i) => { const ex = keywords.find((c)=>c.pageType===p); const su = res.clusters[i]||res.clusters.find((c)=>c.pageType===p); return { pageType: p, primary: ex?.primary?.length?ex.primary:(su?.primary||[]), secondary: ex?.secondary?.length?ex.secondary:(su?.secondary||[]), longtail: ex?.longtail?.length?ex.longtail:(su?.longtail||[]) }; }); setKeywords(merged); toast({ variant: 'success', title: 'Keyword clusters generated.' }); }
    catch (err) { const m = err instanceof ApiError ? err.message : 'AI generation failed.'; toast({ variant: 'error', title: 'Keyword generation failed', text: m }); }
    finally { setLoading(false); }
  };
  const current = keywords[selectedPageIndex];
  const tierEditor = (tier: 'primary'|'secondary'|'longtail', label: string, badge: string, badgeClass: string) => {
    if (!current) return null; const values = current[tier];
    return <div className="keyword-tier"><div className="keyword-tier-label">{label}<span className={'tier-badge '+badgeClass}>{badge}</span></div><Input value={values.join(', ')} onChange={(e)=>{ const parts = e.target.value.split(',').map((p)=>p.trim()).filter(Boolean); updateKeyword(current.pageType, tier, parts); }} placeholder={'Comma-separated '+label.toLowerCase()+' keywords...'} /><div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{values.length} keyword{values.length===1?'':'s'} for {tier}</div></div>;
  };
  return <WizardShell stepEyebrow="Step 5 of 8" stepTitle="Pick your keywords, page by page." stepDescription="Each page gets its own cluster: a primary keyword, secondary, and long-tail. Edit any of them." aside={<WizardAside businessName={basicInfo.businessName} niche={basicInfo.niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={services.length*0.0003+locations.length*0.0004+blogTitles.length*0.0002+allPages.length*0.0002} />}>
    <div className="row" style={{ marginBottom: 18, gap: 10 }}><AISuggestButton onClick={handleGenerate} loading={loading} label="Generate keyword clusters" helper="AI fills the empty slots" /></div>
    <div className="keyword-layout"><div className="keyword-page-list">{keywords.length===0 ? <div className="muted" style={{ padding: 12, fontSize: 13 }}>No pages yet.</div> : keywords.map((c, i) => { const total = c.primary.length+c.secondary.length+c.longtail.length; return <div key={c.pageType} className="keyword-page" aria-current={selectedPageIndex===i?'true':undefined} onClick={()=>setSelectedPage(i)} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedPage(i);}}}><span className="page-name">{c.pageType}</span><span className="page-count">{total} keywords</span></div>; })}</div><div className="keyword-detail">{current ? <><h3>{current.pageType}</h3><div className="keyword-detail-sub">One primary, two to three secondary, and three to five long-tail.</div>{tierEditor('primary','Primary keyword','1','primary')}{tierEditor('secondary','Secondary keywords','2-3','secondary')}{tierEditor('longtail','Long-tail keywords','3-5','longtail')}</> : <div className="muted" style={{ padding: 24, textAlign: 'center' }}>Select a page on the left to edit its keywords.</div>}</div></div>
  </WizardShell>;
}
