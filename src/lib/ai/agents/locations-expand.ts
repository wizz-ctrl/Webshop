import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { locationsExpandOutputSchema, type LocationsExpandOutput } from '../schemas';
import { LOCATIONS_EXPAND_SYSTEM, buildLocationsExpandUserPrompt } from '../prompts';
export interface LocationsExpandInput { niche: string; city?: string; }
const C: Record<string,string[]> = { brooklyn:['Williamsburg','Park Slope','DUMBO','Bushwick','Greenpoint'], austin:['Downtown Austin','South Congress','East Austin','Hyde Park','Mueller'], lahore:['Gulberg','DHA Phase 5','Johar Town','Model Town','Bahria Town'], default:['Downtown','Eastside','Westside','Riverside','Old Town'] };
function fb(i: LocationsExpandInput): LocationsExpandOutput { return { locations: C[(i.city||i.niche).toLowerCase()] || C.default }; }
export async function locationsExpand(input: LocationsExpandInput, projectId?: string): Promise<LocationsExpandOutput> {
  const r = await callAgent({ name: 'locations-expand' as AgentName, model: MODELS.HAIKU, systemPrompt: LOCATIONS_EXPAND_SYSTEM, userPrompt: buildLocationsExpandUserPrompt(input), outputSchema: locationsExpandOutputSchema, fallback: () => fb(input), maxTokens: 400, temperature: 0.7, projectId });
  return r.output;
}
