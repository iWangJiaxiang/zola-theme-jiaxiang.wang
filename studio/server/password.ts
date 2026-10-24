import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || Buffer.byteLength(password) > 1024) throw new Error('密码至少 12 个字符，最多 1024 字节');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (Buffer.byteLength(password) > 1024 || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) return false;
  const [, salt, expected] = hash.split('$');
  return timingSafeEqual(await derive(password, salt), Buffer.from(expected, 'hex'));
}
