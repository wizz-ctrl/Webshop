export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { keywordCluster } from '../../../../lib/ai/agents';
import { generateKeywordsInputSchema, formatZodError } from '../../../../lib/server/schemas';
import type { KeywordCluster } from '../../../../lib/api/contracts';
export async function POST(req: NextRequest) { try { const b = await req.json().catch(()=>({})); const p = generateKeywordsInputSchema.safeParse(b); if(!p.success) return NextResponse.json(formatZodError(p.error),{status:400}); const r = await keywordCluster({businessName:p.data.businessName,niche:p.data.niche,services:p.data.services,locations:p.data.locations,blogTitles:p.data.blogTitles}); const clusters: KeywordCluster[] = r.clusters.map((c)=>({pageType:c.pageType,primary:c.primary,secondary:c.secondary,longtail:c.longtail})); return NextResponse.json({clusters}); } catch(e:any) { if(e?.message?.includes('Rate limit')) return NextResponse.json({error:e.message},{status:429}); console.error('[ai/generate-keywords]',e); return NextResponse.json({error:'Keyword generation failed.'},{status:500}); } }
