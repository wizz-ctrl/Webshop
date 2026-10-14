'use client';
import { useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside } from '../WizardShell';
import { useToast } from '../../ui/Toast';
import { api } from '../../../lib/api/client';
export function Step7Review() {
  const { basicInfo, services, locations, blogTitles, keywords, themeId, imageTier, spendLimit, setSpendLimit } = useWizardStore();
  const { toast } = useToast();
  const [limitInput, setLimitInput] = useState(spendLimit!==undefined?String(spendLimit):'');
  const contentPages = services.length+locations.length+blogTitles.length+4;
  const contentCost = contentPages*0.003;
  const suggestCost = services.length*0.0003+locations.length*0.0004+blogTitles.length*0.0002;
  const keywordCost = keywords.length*0.0002;
  const tiers: Record<string,{p:number;c:number}> = { budget:{p:0.034,c:4}, standard:{p:0.040,c:8}, premium:{p:0.046,c:14} };
  const ti = tiers[imageTier]||tiers.standard;
  const imageCost = ti.p*ti.c;
  const totalCost = contentCost+suggestCost+keywordCost+imageCost;
  const handleNext = async (): Promise<boolean> => {
    const trimmed = limitInput.trim();
    if (trimmed) { const num = Number(trimmed); if (Number.isFinite(num)&&num>0) { setSpendLimit(num); if (num<totalCost) toast({ variant:'warning', title:'Spend cap below estimate.' }); } else { toast({ variant:'warning', title:'Spend cap not a number.' }); return false; } } else { setSpendLimit(undefined); }
    try { await api.saveStep(useWizardStore.getState().projectId||'draft', 7, useWizardStore.getState() as any); } catch {}
    return true;
  };
  return <WizardShell stepEyebrow="Step 7 of 8" stepTitle="Review your brief." stepDescription="Transparent cost breakdown. Optional spending cap. No surprises." nextLabel="Generate my site" onNext={handleNext} aside={<WizardAside businessName={basicInfo.businessName} niche={basicInfo.niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={totalCost} />}>
    <div className="cost-breakdown"><div className="cost-row"><span className="cost-key">Content generation ({contentPages} pages)</span><span className="cost-val ai">{'$'+contentCost.toFixed(4)}</span></div><div className="cost-row"><span className="cost-key">AI suggestions</span><span className="cost-val">{'$'+suggestCost.toFixed(4)}</span></div><div className="cost-row"><span className="cost-key">Keyword clusters ({keywords.length} pages)</span><span className="cost-val">{'$'+keywordCost.toFixed(4)}</span></div><div className="cost-row"><span className="cost-key">Image generation ({ti.c} images)</span><span className="cost-val">{'$'+imageCost.toFixed(4)}</span></div><div className="cost-total"><span className="cost-key">Estimated total</span><span className="cost-val">{'$'+totalCost.toFixed(4)}</span></div></div>
    <div className="spend-limit"><div className="spend-limit-head"><label htmlFor="spend-limit-input">Monthly spend cap</label><span className="spend-limit-optional">Optional</span></div><input id="spend-limit-input" type="number" step="0.01" min="0" value={limitInput} onChange={(e)=>setLimitInput(e.target.value)} placeholder="e.g. 1.00" /><div className="spend-limit-hint">{spendLimit!==undefined?'Cap set: $'+spendLimit.toFixed(2):'No cap set. AI calls run until the brief is complete.'}</div></div>
  </WizardShell>;
}
