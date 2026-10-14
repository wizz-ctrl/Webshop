import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { keywordClusterOutputSchema, type KeywordClusterOutput } from '../schemas';
import { KEYWORD_CLUSTER_SYSTEM, buildKeywordClusterUserPrompt } from '../prompts';
export interface KeywordClusterInput { businessName?: string; niche?: string; services: string[]; locations: string[]; blogTitles: string[]; }
const CPT = ['Home','About','Contact','Privacy'];
function fb(pt: string, n: string, b: string) { return { pageType: pt, primary: [n+' '+pt.toLowerCase()], secondary: ['best '+n+' near me', n+' '+pt.toLowerCase()+' services', b+' '+pt.toLowerCase()], longtail: ['affordable '+n+' '+pt.toLowerCase(), 'local '+n+' '+pt.toLowerCase(), n+' '+pt.toLowerCase()+' reviews', 'top-rated '+n+' '+pt.toLowerCase()] }; }
function fallback(i: KeywordClusterInput): KeywordClusterOutput { const n = i.niche||'business'; const b = i.businessName||''; const pt = [...CPT, ...i.services, ...i.locations.map((l)=>l+' Area'), ...i.blogTitles]; return { clusters: pt.map((p)=>fb(p,n,b)) }; }
export async function keywordCluster(input: KeywordClusterInput, projectId?: string): Promise<KeywordClusterOutput> {
  const r = await callAgent({ name: 'keyword-cluster' as AgentName, model: MODELS.HAIKU, systemPrompt: KEYWORD_CLUSTER_SYSTEM, userPrompt: buildKeywordClusterUserPrompt(input), outputSchema: keywordClusterOutputSchema, fallback: () => fallback(input), maxTokens: 2000, temperature: 0.6, projectId });
  return r.output;
}
