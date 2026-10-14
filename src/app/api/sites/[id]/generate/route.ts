export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../../lib/server/db';
import { enqueue } from '../../../../../lib/server/worker';
export async function POST(_req: NextRequest, { params }: { params: Promise<{id:string}> }) { try { const {id} = await params; const s = await prisma.sites.findUnique({where:{id}}); if(!s) return NextResponse.json({error:'Site not found.'},{status:404}); await prisma.sites.update({where:{id},data:{status:'generating',generatedAt:new Date()}}); enqueue(id); return NextResponse.json({ok:true,streamPath:'/api/sites/'+id+'/stream'}); } catch(e) { console.error('[sites/[id]/generate]',e); return NextResponse.json({error:'Could not start generation.'},{status:500}); } }
