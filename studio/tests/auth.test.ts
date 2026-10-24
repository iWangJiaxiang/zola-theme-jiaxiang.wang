import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../server/password.js';

test('passwords use unique salts, verify only the correct password, reject malformed hashes', async () => {
  const a = await hashPassword('a-long-test-password');
  const b = await hashPassword('a-long-test-password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('a-long-test-password', a), true);
  assert.equal(await verifyPassword('wrong', a), false);
  assert.equal(await verifyPassword('a-long-test-password', 'scrypt$bad'), false);
});
test('password setup rejects short and unbounded values', async () => {
  await assert.rejects(hashPassword('short'), /12/);
  await assert.rejects(hashPassword('a'.repeat(2000)), /1024/);
});
