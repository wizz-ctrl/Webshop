import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { blogTitlesOutputSchema, type BlogTitlesOutput } from '../schemas';
import { BLOG_TITLES_SYSTEM, buildBlogTitlesUserPrompt } from '../prompts';
export interface BlogTitlesInput { niche: string; services: string[]; }
function fb(i: BlogTitlesInput): BlogTitlesOutput { const p = i.services[0]||i.niche; return { titles: ['Why '+p+' matters in your neighbourhood','How to choose a '+i.niche+' you can trust',"5 signs it's time to call a "+i.niche+' professional'] }; }
export async function blogTitles(input: BlogTitlesInput, projectId?: string): Promise<BlogTitlesOutput> {
  const r = await callAgent({ name: 'blog-titles' as AgentName, model: MODELS.HAIKU, systemPrompt: BLOG_TITLES_SYSTEM, userPrompt: buildBlogTitlesUserPrompt(input), outputSchema: blogTitlesOutputSchema, fallback: () => fb(input), maxTokens: 400, temperature: 0.7, projectId });
  return r.output;
}
