import { imageBudgetOutputSchema, type ImageBudgetOutput } from '../schemas';
export interface ImageBudgetInput { plan:'free'|'growth'|'agency'; pageCount:number; servicesCount:number; locationsCount:number; blogCount:number; userTierPreference?:'budget'|'standard'|'premium'; }
const TP = { budget:{perImage:0.034,count:4}, standard:{perImage:0.040,count:8}, premium:{perImage:0.046,count:14} } as const;
const PL = { free:'budget' as const, growth:'standard' as const, agency:'premium' as const };
export async function imageBudget(input: ImageBudgetInput): Promise<ImageBudgetOutput> {
  const tier = input.userTierPreference||PL[input.plan]; const p = TP[tier];
  const ic = Math.min(p.count, Math.max(4, input.servicesCount+input.locationsCount+1));
  const c = tier==='premium' ? Math.max(14,ic) : ic;
  return imageBudgetOutputSchema.parse({ tier, imageCount:c, estimatedCostUsd:+(c*p.perImage).toFixed(4), reasoning:'Plan '+input.plan+' -> '+tier+' tier. '+c+' images at $'+p.perImage.toFixed(3)+'/image.' });
}
