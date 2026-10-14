import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { servicesSuggestOutputSchema, type ServicesSuggestOutput } from '../schemas';
import { SERVICES_SUGGEST_SYSTEM, buildServicesSuggestUserPrompt } from '../prompts';
export interface ServicesSuggestInput { businessName?: string; niche: string; }
const C: Record<string,string[]> = { cafe:['Espresso Bar','Pour-Over Coffee','Pastries & Baking','Coffee Beans (Retail)','Catering'], dentist:['Cleanings & Checkups','Teeth Whitening','Cosmetic Dentistry','Emergency Dentistry','Invisalign'], plumber:['Drain Cleaning','Leak Repair','Water Heater Install','Emergency Plumbing','Pipe Replacement'], law:['Estate Planning','Family Law','Criminal Defense','Business Law','Personal Injury'], default:['Consultation','Custom Service','Repair & Maintenance','Onsite Visit','Online Booking'] };
function fb(i: ServicesSuggestInput): ServicesSuggestOutput { return { services: C[i.niche.toLowerCase()] || C.default }; }
export async function servicesSuggest(input: ServicesSuggestInput, projectId?: string): Promise<ServicesSuggestOutput> {
  const r = await callAgent({ name: 'services-suggest' as AgentName, model: MODELS.HAIKU, systemPrompt: SERVICES_SUGGEST_SYSTEM, userPrompt: buildServicesSuggestUserPrompt(input), outputSchema: servicesSuggestOutputSchema, fallback: () => fb(input), maxTokens: 400, temperature: 0.7, projectId });
  return r.output;
}
