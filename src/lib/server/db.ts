import { PrismaClient } from '@prisma/client';
const g = globalThis as unknown as { __prisma?: PrismaClient };
if (!g.__prisma) { g.__prisma = new PrismaClient({ log: ['error', 'warn'] }); }
export const prisma = g.__prisma!;
