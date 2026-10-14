export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { servicesSuggest } from '../../../../lib/ai/agents';
import { suggestServicesInputSchema, formatZodError } from '../../../../lib/server/schemas';
export async function POST(req: NextRequest) { try { const b = await req.json().catch(()=>({})); const p = suggestServicesInputSchema.safeParse(b); if(!p.success) return NextResponse.json(formatZodError(p.error),{status:400}); const r = await servicesSuggest({niche:p.data.niche,businessName:p.data.businessName}); return NextResponse.json({services:r.services}); } catch(e:any) { if(e?.message?.includes('Rate limit')) return NextResponse.json({error:e.message},{status:429}); console.error('[ai/suggest-services]',e); return NextResponse.json({error:'AI suggest failed.'},{status:500}); } }
