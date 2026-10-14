import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
const ALGO = 'aes-256-gcm'; const IV_LEN = 12;
function getKey(): Buffer {
  const envKey = process.env.OPENROUTER_ENCRYPTION_KEY;
  if (envKey) { const buf = Buffer.from(envKey, 'base64'); if (buf.length !== 32) throw new Error('OPENROUTER_ENCRYPTION_KEY must decode to 32 bytes'); return buf; }
  return scryptSync(process.env.OPENROUTER_DEV_SECRET || 'localloop-dev-do-not-use-in-prod', 'localloop-salt-v1', 32);
}
export function encrypt(plaintext: string): string {
  const key = getKey(); const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString('base64');
}
export function decrypt(payload: string): string {
  const key = getKey(); const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_LEN + 16) throw new Error('Ciphertext too short');
  const iv = buf.subarray(0, IV_LEN); const tag = buf.subarray(buf.length - 16); const ciphertext = buf.subarray(IV_LEN, buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
export function maskKey(key: string): string { return key.length <= 8 ? '••••' : `••••${key.slice(-4)}`; }
