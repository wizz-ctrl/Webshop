export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { locationsExpand } from '../../../../lib/ai/agents';
import { suggestLocationsInputSchema, formatZodError } from '../../../../lib/server/schemas';
export async function POST(req: NextRequest) { try { const b = await req.json().catch(()=>({})); const p = suggestLocationsInputSchema.safeParse(b); if(!p.success) return NextResponse.json(formatZodError(p.error),{status:400}); const r = await locationsExpand({niche:p.data.niche,city:p.data.city}); return NextResponse.json({locations:r.locations}); } catch(e:any) { if(e?.message?.includes('Rate limit')) return NextResponse.json({error:e.message},{status:429}); console.error('[ai/suggest-locations]',e); return NextResponse.json({error:'AI suggest failed.'},{status:500}); } }
