import { callAgent, MODELS, type AgentName } from '../../server/llm';
import { imageGenerateOutputSchema, type ImageGenerateOutput } from '../schemas';
import { IMAGE_GENERATE_SYSTEM, buildImageGenerateUserPrompt } from '../prompts';
export interface ImageGenerateInput { businessName:string; niche:string; pageType:string; tier:'budget'|'standard'|'premium'; }
const PI = ['https://images.unsplash.com/photo-1554118811-93e9d9d6c3a4?w=1280&h=720&fit=crop','https://images.unsplash.com/photo-1441986300917-6464292b5e4c?w=1280&h=720&fit=crop','https://images.unsplash.com/photo-1524170849480-7f9d4c9d3e3e?w=1280&h=720&fit=crop','https://images.unsplash.com/photo-1503676260711-2a14b3d9d8c0?w=1280&h=720&fit=crop','https://images.unsplash.com/photo-1571260893578-dbf41e7211b6?w=1280&h=720&fit=crop'];
function fb(i: ImageGenerateInput): ImageGenerateOutput { const h = i.niche.split('').reduce((a,c)=>a+c.charCodeAt(0),0); return { imageUrl: PI[h%PI.length], prompt: 'Hero image for '+i.businessName, model: 'placeholder', width: 1280, height: 720 }; }
export async function imageGenerate(input: ImageGenerateInput, projectId?: string): Promise<ImageGenerateOutput> {
  const m = input.tier==='premium' ? MODELS.GPT_IMAGE : MODELS.GEMINI_IMAGE;
  const r = await callAgent({ name: 'image-generate' as AgentName, model: m, systemPrompt: IMAGE_GENERATE_SYSTEM, userPrompt: buildImageGenerateUserPrompt(input), outputSchema: imageGenerateOutputSchema, fallback: ()=>fb(input), maxTokens: 500, temperature: 0.6, projectId });
  return r.output;
}
