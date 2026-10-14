export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { blogTitles } from '../../../../lib/ai/agents';
import { suggestBlogTitlesInputSchema, formatZodError } from '../../../../lib/server/schemas';
export async function POST(req: NextRequest) { try { const b = await req.json().catch(()=>({})); const p = suggestBlogTitlesInputSchema.safeParse(b); if(!p.success) return NextResponse.json(formatZodError(p.error),{status:400}); const r = await blogTitles({niche:p.data.niche,services:p.data.services}); return NextResponse.json({titles:r.titles}); } catch(e:any) { if(e?.message?.includes('Rate limit')) return NextResponse.json({error:e.message},{status:429}); console.error('[ai/suggest-blog-titles]',e); return NextResponse.json({error:'AI suggest failed.'},{status:500}); } }
