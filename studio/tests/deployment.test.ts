import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MAKERS_MEDIA_SIZE, MAX_UPLOAD_SIZE } from '../shared/media.js';
import { readUploadBody } from '../server/media-upload.js';
import cloudHandler from '../cloud-functions/api/[[default]].js';
import * as cloudEntry from '../cloud-functions/api/[[default]].js';

const env = { STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_ADMIN_USER: 'owner',
  STUDIO_ADMIN_PASSWORD_HASH: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}`,
  STUDIO_ORIGIN: 'https://studio.example', STUDIO_STATE: 'blob', STUDIO_GIT_URL: 'https://git.example/repo.git', STUDIO_GIT_TOKEN: 'dummy' };
test('cloud entry retains the named onRequest export required by the platform route scanner', () => {
  assert.ok(Object.hasOwn(cloudEntry, 'onRequest'), 'default-only bundle exports are not recognized as cloud handlers');
  assert.equal(Reflect.get(cloudEntry, 'onRequest'), cloudHandler);
});
test('cloud handler rejects partial deployments instead of falling back to ephemeral local storage', async () => {
  for (const change of [{ STUDIO_STATE: 'file' }, { STUDIO_GIT_URL: '' }, { STUDIO_ORIGIN: 'http://localhost:5173' }, { STUDIO_SESSION_SECRET: 'short' }]) {
    const response = await cloudHandler({ request: new Request('https://studio.example/api/auth/config'), env: { ...env, ...change } });
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('dummy'), false);
  }
});
test('deployment config uses supported output directory and timeout and never contains runtime secrets', async () => {
  const text = await readFile(new URL('../edgeone.json', import.meta.url), 'utf8');
  const config = JSON.parse(text);
  assert.equal(config.outputDirectory, 'dist/client');
  assert.equal(config.nodeVersion, '22.21.1');
  assert.equal(config.cloudFunctions.nodejs.maxDuration, 120);
  assert.equal(text.includes('STUDIO_'), false);
  assert.ok(config.headers[0].headers.some((header: { key: string; value: string }) => header.key === 'X-Frame-Options' && header.value === 'DENY'));
});
test('cloud upload streaming enforces the deployment limit even with dishonest Content-Length', async () => {
  assert.ok(MAKERS_MEDIA_SIZE < 6 * 1024 * 1024);
  assert.equal(MAX_UPLOAD_SIZE, 20 * 1024 * 1024);
  const bytes = Buffer.alloc(MAKERS_MEDIA_SIZE);
  assert.equal((await readUploadBody(new Request('https://studio.example', { method: 'POST', body: bytes }), MAKERS_MEDIA_SIZE)).byteLength, bytes.length);
  await assert.rejects(() => readUploadBody(new Request('https://studio.example', { method: 'POST', headers: { 'Content-Length': '1' }, body: Buffer.alloc(MAKERS_MEDIA_SIZE + 1) }), MAKERS_MEDIA_SIZE), error => {
    assert.equal((error as { status: number }).status, 413);
    assert.deepEqual((error as { params: unknown }).params, { limit: 4 });
    return true;
  });
});
