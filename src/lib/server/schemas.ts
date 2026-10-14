import { z } from 'zod';
export const basicInfoSchema = z.object({ businessName: z.string().min(2).max(64), niche: z.string().min(2).max(48), tagline: z.string().max(120).optional(), tone: z.enum(['friendly', 'professional', 'expert', 'playful']).default('friendly') });
export const serviceSchema = z.object({ id: z.string().optional(), name: z.string().min(1).max(64), aiGenerated: z.boolean().default(false) });
export const locationSchema = z.object({ id: z.string().optional(), name: z.string().min(1).max(64), strategy: z.enum(['neighborhoods', 'nearby-cities']).default('neighborhoods'), aiGenerated: z.boolean().default(false) });
export const blogTitleSchema = z.object({ id: z.string().optional(), title: z.string().min(1).max(160), aiGenerated: z.boolean().default(false) });
export const keywordClusterItemSchema = z.object({ pageType: z.string().min(1).max(80), primary: z.array(z.string()), secondary: z.array(z.string()), longtail: z.array(z.string()) });
export const keywordClusterOutputSchema = z.object({ clusters: z.array(keywordClusterItemSchema).min(1).max(30) });
export const wizardStateSchema = z.object({ projectId: z.string().nullable().optional(), currentStep: z.number().int().min(1).max(8).optional(), basicInfo: basicInfoSchema.partial().optional(), services: z.array(serviceSchema).optional(), locations: z.array(locationSchema).optional(), blogTitles: z.array(blogTitleSchema).optional(), keywords: z.array(keywordClusterItemSchema).optional(), themeId: z.string().nullable().optional(), imageTier: z.enum(['budget', 'standard', 'premium']).optional(), spendLimit: z.number().positive().optional() });
export const suggestServicesInputSchema = z.object({ niche: z.string().min(1).max(48), businessName: z.string().max(64).optional() });
export const suggestLocationsInputSchema = z.object({ niche: z.string().min(1).max(48), city: z.string().max(64).optional() });
export const suggestBlogTitlesInputSchema = z.object({ niche: z.string().min(1).max(48), services: z.array(z.string()).default([]) });
export const generateKeywordsInputSchema = z.object({ businessName: z.string().max(64).optional(), niche: z.string().max(48).optional(), services: z.array(z.string()).default([]), locations: z.array(z.string()).default([]), blogTitles: z.array(z.string()).default([]) });
export const saveKeyInputSchema = z.object({ key: z.string().min(8).max(256) });
export function formatZodError(error: z.ZodError) { return { error: 'Validation failed.', details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }; }
