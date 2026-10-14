export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../lib/server/db';
import type { Site, ImageTier } from '../../../../lib/api/contracts';
function toSite(s: any): Site { return {id:s.id,projectId:s.projectId,businessName:s.businessName||'',theme:s.theme,imageTier:s.imageTier as ImageTier,status:s.status,deployUrl:s.deployUrl,costUsd:s.costUsd,generatedAt:s.generatedAt?s.generatedAt.toISOString():null,pageCount:s.pageCount}; }
export async function GET(_req: NextRequest, { params }: { params: Promise<{id:string}> }) { try { const {id} = await params; const s = await prisma.sites.findUnique({where:{id}}); if(!s) return NextResponse.json({error:'Site not found.'},{status:404}); return NextResponse.json(toSite(s)); } catch(e) { console.error('[sites/[id]] GET',e); return NextResponse.json({error:'Could not load.'},{status:500}); } }
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{id:string}> }) { try { const {id} = await params; await prisma.sites.delete({where:{id}}).catch(()=>null); return new Response(null,{status:204}); } catch(e) { console.error('[sites/[id]] DELETE',e); return NextResponse.json({error:'Could not delete.'},{status:500}); } }
