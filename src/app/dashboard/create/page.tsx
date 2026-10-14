'use client';
import { useWizardStore } from '../../../lib/wizard/store';
import { Step1BasicInfo } from '../../../components/wizard/steps/Step1BasicInfo';
import { Step2Services } from '../../../components/wizard/steps/Step2Services';
import { Step3Locations } from '../../../components/wizard/steps/Step3Locations';
import { Step4BlogTitles } from '../../../components/wizard/steps/Step4BlogTitles';
import { Step5Keywords } from '../../../components/wizard/steps/Step5Keywords';
import { Step6Design } from '../../../components/wizard/steps/Step6Design';
import { Step7Review } from '../../../components/wizard/steps/Step7Review';
import { Step8Generate } from '../../../components/wizard/steps/Step8Generate';
export default function CreatePage() { const s = useWizardStore((st)=>st.currentStep); switch(s) { case 1: return <Step1BasicInfo/>; case 2: return <Step2Services/>; case 3: return <Step3Locations/>; case 4: return <Step4BlogTitles/>; case 5: return <Step5Keywords/>; case 6: return <Step6Design/>; case 7: return <Step7Review/>; case 8: return <Step8Generate/>; default: return <Step1BasicInfo/>; } }
