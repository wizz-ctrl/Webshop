export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '../../../../lib/server/db';
import { getDevUser } from '../../../../lib/server/dev-user';
import { encrypt, decrypt, maskKey } from '../../../../lib/server/crypto';
import { saveKeyInputSchema, formatZodError } from '../../../../lib/server/schemas';
const OPENROUTER_URL = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
export async function GET() { try { const u = await getDevUser(); const usr = await prisma.users.findUnique({where:{id:u.id}}); if(!usr?.openrouterKeyEncrypted) return NextResponse.json({state:'missing',message:'No key on file.'}); try { const key = decrypt(usr.openrouterKeyEncrypted); const res = await fetch(OPENROUTER_URL+'/auth/key',{headers:{Authorization:'Bearer '+key}}); if(!res.ok) return NextResponse.json({state:'invalid',message:'OpenRouter '+res.status}); const d = await res.json() as any; return NextResponse.json({state:'connected',balanceUsd:Number(d?.data?.limit_remaining??0)}); } catch { return NextResponse.json({state:'missing',message:'Could not validate key.'}); } } catch(e) { console.error('[openrouter-key] GET',e); return NextResponse.json({error:'Internal error.'},{status:500}); } }
export async function POST(req: NextRequest) { try { const b = await req.json().catch(()=>({})); const p = saveKeyInputSchema.safeParse(b); if(!p.success) return NextResponse.json(formatZodError(p.error),{status:400}); const key = p.data.key.trim(); const u = await getDevUser(); const ct = encrypt(key); await prisma.users.update({where:{id:u.id},data:{openrouterKeyEncrypted:ct}}); return NextResponse.json({ok:true}); } catch(e) { console.error('[openrouter-key] POST',e); return NextResponse.json({error:'Could not save key.'},{status:500}); } }
