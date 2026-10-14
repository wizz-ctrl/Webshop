export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/db';
import { getDevUser } from '../../../../lib/server/dev-user';
import type { LedgerEntry } from '../../../../lib/api/contracts';
export async function GET() { try { const u = await getDevUser(); const rows = await prisma.openrouter_ledger.findMany({ where:{userId:u.id}, orderBy:{createdAt:'desc'}, take:100 }); const entries: LedgerEntry[] = rows.map((r: any)=>({id:r.id,step:r.step,model:r.model,costUsd:r.costUsd,createdAt:r.createdAt.toISOString()})); return NextResponse.json(entries); } catch(e) { console.error('[ledger] GET',e); return NextResponse.json({error:'Could not load ledger.'},{status:500}); } }
