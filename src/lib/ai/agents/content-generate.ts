import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { contentGenerateOutputSchema, type ContentGenerateOutput } from '../schemas';
import { CONTENT_GENERATE_SYSTEM, buildContentGenerateUserPrompt } from '../prompts';
export interface ContentGenerateInput { businessName: string; niche: string; tone?: string; pageName: string; pageType: string; keywords?: { primary?: string[]; secondary?: string[]; longtail?: string[] }; services: string[]; locations: string[]; allPages: string[]; }
function slug(n: string) { return n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'page'; }
function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function fbHtml(i: ContentGenerateInput): string {
  const links = i.allPages.filter((p)=>p!==i.pageName).slice(0,6).map((p)=>'<li><a href="'+(slug(p)==='home'?'index.html':slug(p)+'.html')+'">'+esc(p)+'</a></li>').join('\n');
  return '<section><h1>'+esc(i.pageName)+'</h1><p>'+esc(i.businessName)+' — '+esc(i.niche)+'. This page covers our '+esc(i.pageName.toLowerCase())+' offering.</p><h2>What we do</h2><p>Our '+esc(i.pageName.toLowerCase())+' service is built for local customers who want reliable work from a neighbourhood business.</p><ul>'+i.services.map((s)=>'<li><a href="'+slug(s)+'.html">'+esc(s)+'</a></li>').join('')+'</ul><h2>Where we work</h2><ul>'+i.locations.map((l)=>'<li><a href="'+slug(l+' Area')+'.html">'+esc(l)+'</a></li>').join('')+'</ul></section><aside><h3>More from '+esc(i.businessName)+'</h3><ul>'+links+'</ul></aside>';
}
function fallback(i: ContentGenerateInput): ContentGenerateOutput {
  const html = fbHtml(i);
  return { html, title: i.pageName+' — '+i.businessName, metaDescription: (i.businessName+' — '+i.niche+'. '+i.pageName+' page with service details and contact info.').slice(0,160), wordCount: Math.max(200, html.split(/\s+/).length), jsonLd: { '@context':'https://schema.org','@type':'LocalBusiness', name:i.businessName, description:i.businessName+' — '+i.niche, url:'https://preview.localloop.dev/sites/'+slug(i.businessName), image:'/assets/cafe-color.png', priceRange:'$$', knowsAbout:i.services } };
}
export async function contentGenerate(input: ContentGenerateInput, projectId?: string): Promise<ContentGenerateOutput> {
  const r = await callAgent({ name: 'content-generate' as AgentName, model: MODELS.SONNET, systemPrompt: CONTENT_GENERATE_SYSTEM, userPrompt: buildContentGenerateUserPrompt(input), outputSchema: contentGenerateOutputSchema, fallback: () => fallback(input), maxTokens: 4000, temperature: 0.8, projectId });
  return r.output;
}
