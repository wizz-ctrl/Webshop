'use client';
import { useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside, TierHint } from '../WizardShell';
import { Field } from '../../ui/Field';
import { Chip, ChipInput } from '../Chip';
import { AISuggestButton } from '../AISuggestButton';
import { useToast } from '../../ui/Toast';
import { api, ApiError } from '../../../lib/api/client';
const F = 5;
export function Step2Services() {
  const { basicInfo, services, addService, removeService, locations, blogTitles, themeId, imageTier } = useWizardStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const handleSuggest = async () => {
    if (!basicInfo.businessName || !basicInfo.niche) { toast({ variant: 'warning', title: 'Add your business name and niche first.' }); return; }
    setLoading(true);
    try { const res = await api.suggestServices(basicInfo.niche, basicInfo.businessName); const ex = new Set(services.map((s)=>s.name.toLowerCase())); let added = 0; for (const n of res.services) { if (!ex.has(n.toLowerCase()) && services.length + added < F) { addService(n, true); added++; } } toast({ variant: 'success', title: 'Added '+added+' AI-suggested service'+(added===1?'':'s')+'.' }); }
    catch (err) { const m = err instanceof ApiError ? err.message : 'AI suggest failed.'; toast({ variant: 'error', title: 'AI suggest failed', text: m }); }
    finally { setLoading(false); }
  };
  return <WizardShell stepEyebrow="Step 2 of 8" stepTitle="What do you do?" stepDescription="List the services you offer. Each becomes its own page. Add your own, or let AI suggest some." nextDisabled={services.length===0} aside={<WizardAside businessName={basicInfo.businessName} niche={basicInfo.niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={services.length*0.0003} />} tierHint={<TierHint used={services.length} total={F} label="services" />}>
    <Field label="Services" required helper="Each service gets a dedicated page with LocalBusiness schema."><AISuggestButton onClick={handleSuggest} loading={loading} label="Suggest services" helper={services.length+'/'+F+' on free tier'} /></Field>
    {services.length > 0 && <div className="chip-row" style={{ marginTop: 14 }}>{services.map((s)=><Chip key={s.id} label={s.name} aiGenerated={s.aiGenerated} onRemove={()=>removeService(s.id)} />)}</div>}
    <div style={{ marginTop: 16 }}><ChipInput onAdd={(v)=>addService(v,false)} placeholder="e.g. Espresso bar, Catering..." label="Add service" /></div>
  </WizardShell>;
}
