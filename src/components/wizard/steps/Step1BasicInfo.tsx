'use client';
import { useState } from 'react';
import { useWizardStore } from '../../../lib/wizard/store';
import { WizardShell, WizardAside, TierHint } from '../WizardShell';
import { Field, Input, Select } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { api } from '../../../lib/api/client';
export function Step1BasicInfo() {
  const { basicInfo, setBasicInfo, services, locations, blogTitles, themeId, imageTier } = useWizardStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const businessName = basicInfo.businessName || ''; const niche = basicInfo.niche || '';
  const tagline = basicInfo.tagline || ''; const tone = basicInfo.tone || 'friendly';
  const valid = businessName.trim().length >= 2 && niche.trim().length >= 2;
  const handleNext = async (): Promise<boolean> => {
    if (!valid) { toast({ variant: 'warning', title: 'Tell us a bit more.', text: 'Business name and niche need at least 2 characters each.' }); return false; }
    setSaving(true); try { await api.saveStep(basicInfo.businessName ? 'draft' : 'draft', 1, { basicInfo }); } catch {} finally { setSaving(false); } return true;
  };
  return <WizardShell stepEyebrow="Step 1 of 8" stepTitle="Tell us about your business." stepDescription="The basics. We will use these to choose a vertical pack and write your pages." onNext={handleNext} hideBack nextDisabled={!valid} aside={<WizardAside businessName={businessName} niche={niche} servicesCount={services.length} locationsCount={locations.length} blogCount={blogTitles.length} theme={themeId||undefined} imageTier={imageTier} costSoFar={0} />} tierHint={<TierHint used={0} total={1} label="full site generation" />}>
    <div className="field-group"><Field label="Business name" required helper="The name your customers see."><Input value={businessName} onChange={(e)=>setBasicInfo({businessName:e.target.value})} placeholder="Sunday Coffee" invalid={businessName.length>0&&businessName.length<2} maxLength={64} /></Field><Field label="Niche / Industry" required helper="What kind of business is this?"><Input value={niche} onChange={(e)=>setBasicInfo({niche:e.target.value})} placeholder="Cafe, Dentist, Plumber..." invalid={niche.length>0&&niche.length<2} maxLength={48} /></Field></div>
    <Field label="Tagline" optional helper="One short sentence about what makes you different."><Input value={tagline} onChange={(e)=>setBasicInfo({tagline:e.target.value})} placeholder="Coffee that tastes like Sunday morning." maxLength={120} /></Field>
    <Field label="Tone of voice" required helper="How should the AI write your pages?"><Select value={tone} onChange={(e)=>setBasicInfo({tone:e.target.value as any})}><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="expert">Expert</option><option value="playful">Playful</option></Select></Field>
  </WizardShell>;
}
