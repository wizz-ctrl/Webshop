'use client';
import { useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside, TierHint } from '../WizardShell';
import { Field } from '../../ui/Field';
import { Chip, ChipInput } from '../Chip';
import { AISuggestButton } from '../AISuggestButton';
import { useToast } from '../../ui/Toast';
import { api, ApiError } from '../../../lib/api/client';
const F = 2;
export function Step3Locations() {
  const { basicInfo, locations, addLocation, removeLocation, services, blogTitles, themeId, imageTier } = useWizardStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');
  const handleSuggest = async () => {
    if (!basicInfo.niche) { toast({ variant: 'warning', title: 'Add your niche first.' }); return; }
    setLoading(true);
    try { const res = await api.suggestLocations(basicInfo.niche, city||basicInfo.businessName||'main'); const ex = new Set(locations.map((l)=>l.name.toLowerCase())); let added = 0; for (const n of res.locations) { if (!ex.has(n.toLowerCase()) && locations.length+added<F) { addLocation(n,'neighborhoods',true); added++; } } toast({ variant: 'success', title: 'Added '+added+' location'+(added===1?'':'s')+'.' }); }
    catch (err) { const m = err instanceof ApiError ? err.message : 'AI suggest failed.'; toast({ variant: 'error', title: 'AI suggest failed', text: m }); }
    finally { setLoading(false); }
  };
  const setStrategy = (id: string, strategy: 'neighborhoods'|'nearby-cities') => { useWizardStore.setState((s)=>({ locations: s.locations.map((l)=>l.id===id?{...l,strategy}:l) })); };
  return <WizardShell stepEyebrow="Step 3 of 8" stepTitle="Where do you work?" stepDescription="Add the cities and neighbourhoods you serve. We generate one location-optimized page per area." nextDisabled={locations.length===0} aside={<WizardAside businessName={basicInfo.businessName} niche={basicInfo.niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={services.length*0.0003+locations.length*0.0004} />} tierHint={<TierHint used={locations.length} total={F} label="locations" />}>
    <Field label="Anchor city" optional helper="The main city your business is based in."><input className="field-input" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="e.g. Brooklyn, Austin..." maxLength={48} /></Field>
    <Field label="Locations" required helper="Pick a strategy per location: Neighbourhoods or Nearby Cities."><AISuggestButton onClick={handleSuggest} loading={loading} label="Suggest locations" helper={locations.length+'/'+F+' on free tier'} /></Field>
    {locations.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>{locations.map((loc)=><div key={loc.id} className="card pad-sm row between" style={{ flexWrap: 'wrap', gap: 10 }}><div className="row" style={{ gap: 10 }}><Chip label={loc.name} aiGenerated={loc.aiGenerated} onRemove={()=>removeLocation(loc.id)} /></div><div className="row" style={{ gap: 6 }}><button type="button" className={'btn btn-sm '+(loc.strategy==='neighborhoods'?'btn-primary':'btn-secondary')} onClick={()=>setStrategy(loc.id,'neighborhoods')} aria-pressed={loc.strategy==='neighborhoods'}>Neighbourhoods</button><button type="button" className={'btn btn-sm '+(loc.strategy==='nearby-cities'?'btn-primary':'btn-secondary')} onClick={()=>setStrategy(loc.id,'nearby-cities')} aria-pressed={loc.strategy==='nearby-cities'}>Nearby Cities</button></div></div>)}</div>}
    <div style={{ marginTop: 16 }}><ChipInput onAdd={(v)=>addLocation(v,'neighborhoods',false)} placeholder="e.g. Williamsburg, Park Slope..." label="Add location" /></div>
  </WizardShell>;
}
