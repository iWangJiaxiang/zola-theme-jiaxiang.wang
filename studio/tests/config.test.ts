import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.js';
import cloudHandler from '../cloud-functions/api/[[default]].js';
const base = { STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_ADMIN_USER: 'owner', STUDIO_ADMIN_PASSWORD_HASH: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}` };
test('configuration separates local authentication from Git credentials and enforces safe origins', () => {
  assert.equal(loadConfig(base).repository.mode, 'local');
  assert.equal(loadConfig({ ...base, STUDIO_GIT_URL: 'https://cnb.cool/group/blog.git', STUDIO_GIT_USERNAME: 'cnb', STUDIO_GIT_TOKEN: 'example' }).repository.mode, 'git');
  for (const env of [{ STUDIO_ORIGIN: 'http://public.example' }, { STUDIO_ORIGIN: 'https://studio.example/path' }, { STUDIO_SESSION_SECRET: 'short' }, { STUDIO_ADMIN_PASSWORD_HASH: '' }, { STUDIO_STATE: 'blob' }, { STUDIO_GIT_URL: 'https://user:secret@github.com/owner/repo' }]) assert.throws(() => loadConfig({ ...base, ...env }));
});
test('OIDC requires explicit subjects and preserves the exact issuer', () => {
  const settings = { STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_OIDC_ISSUER: 'https://identity.example/', STUDIO_OIDC_CLIENT_ID: 'studio', STUDIO_OIDC_SUBJECTS: 'one,two' };
  assert.equal(loadConfig(settings).config.oidc!.issuer, 'https://identity.example/');
  assert.deepEqual(loadConfig(settings).config.oidc!.subjects, ['one', 'two']);
  assert.throws(() => loadConfig({ ...settings, STUDIO_OIDC_SUBJECTS: '' }));
  assert.throws(() => loadConfig({ ...settings, STUDIO_OIDC_ISSUER: 'http://identity.example/' }));
});
test('cloud entry refuses ephemeral file state instead of accepting writes', async () => {
  const response = await cloudHandler({ request: new Request('https://studio.example/api/auth/config'), env: { ...base, STUDIO_ORIGIN: 'https://studio.example', STUDIO_STATE: 'file', STUDIO_GIT_URL: 'https://git.example/repo.git' } });
  assert.equal(response.status, 503);
});
