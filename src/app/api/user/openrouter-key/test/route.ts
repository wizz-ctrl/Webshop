export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/db';
import { getDevUser } from '../../../../../lib/server/dev-user';
import { decrypt, maskKey } from '../../../../../lib/server/crypto';
const OPENROUTER_URL = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
export async function POST() { try { const u = await getDevUser(); const usr = await prisma.users.findUnique({where:{id:u.id}}); if(!usr?.openrouterKeyEncrypted) return NextResponse.json({state:'missing',message:'No key on file.'}); const key = decrypt(usr.openrouterKeyEncrypted); const res = await fetch(OPENROUTER_URL+'/auth/key',{headers:{Authorization:'Bearer '+key}}); if(!res.ok) return NextResponse.json({state:'invalid',message:'OpenRouter '+res.status}); const d = await res.json() as any; return NextResponse.json({state:'connected',balanceUsd:Number(d?.data?.limit_remaining??0)}); } catch(e) { console.error('[openrouter-key/test]',e); return NextResponse.json({state:'invalid',message:'Test failed.'}); } }
