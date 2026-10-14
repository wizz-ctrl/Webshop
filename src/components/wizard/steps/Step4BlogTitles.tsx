'use client';
import { useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside, TierHint } from '../WizardShell';
import { Field } from '../../ui/Field';
import { Chip } from '../Chip';
import { AISuggestButton } from '../AISuggestButton';
import { useToast } from '../../ui/Toast';
import { api, ApiError } from '../../../lib/api/client';
const F = 1;
export function Step4BlogTitles() {
  const { basicInfo, services, blogTitles, toggleBlogTitle, removeBlogTitle, locations, themeId, imageTier } = useWizardStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const handleSuggest = async () => {
    if (!basicInfo.niche || services.length===0) { toast({ variant: 'warning', title: 'Add your niche and services first.' }); return; }
    setLoading(true);
    try { const res = await api.suggestBlogTitles(basicInfo.niche, services.map((s)=>s.name)); setSuggestions(res.titles); }
    catch (err) { const m = err instanceof ApiError ? err.message : 'AI suggest failed.'; toast({ variant: 'error', title: 'AI suggest failed', text: m }); }
    finally { setLoading(false); }
  };
  return <WizardShell stepEyebrow="Step 4 of 8" stepTitle="What will you blog about?" stepDescription="Blogs keep your site fresh and let you target long-tail keywords. Pick one to start — the free tier covers one post." nextDisabled={false} nextLabel="Skip blog for now" aside={<WizardAside businessName={basicInfo.businessName} niche={basicInfo.niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={services.length*0.0003+locations.length*0.0004+blogTitles.length*0.0002} />} tierHint={<TierHint used={blogTitles.length} total={F} label="blog post" />}>
    <Field label="Blog posts" helper="Each post becomes a fully-written article on your site."><AISuggestButton onClick={handleSuggest} loading={loading} label="Suggest blog titles" helper="AI suggests three locally relevant topics" /></Field>
    {suggestions.length > 0 && <div className="card pad-sm" style={{ marginTop: 14 }}><div className="muted" style={{ fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 650 }}>AI Suggestions</div><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{suggestions.map((t)=>{ const selected = blogTitles.some((b)=>b.title===t); return <button key={t} type="button" className={'btn btn-secondary btn-sm '+(selected?'btn-primary':'')} style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }} onClick={()=>toggleBlogTitle(t,true)} aria-pressed={selected}>{t}</button>; })}</div></div>}
    {blogTitles.length > 0 && <div className="chip-row" style={{ marginTop: 14 }}>{blogTitles.map((b)=><Chip key={b.id} label={b.title} aiGenerated={b.aiGenerated} onRemove={()=>removeBlogTitle(b.id)} />)}</div>}
  </WizardShell>;
}
