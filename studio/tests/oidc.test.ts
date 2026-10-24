import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import * as oidc from 'openid-client';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../server/app.js';
import { LocalRepository } from '../server/repository.js';
import { FileState } from '../server/state.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const issuer = 'https://identity.example.test';
function jwt(claims: object, badSignature = false) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url');
  return `${header}.${body}.${badSignature ? signature.slice(0, -8) + 'xxxxxxxx' : signature}`;
}
test('OIDC code flow verifies PKCE, nonce, signature and exact subject authorization', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-oidc-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  for (const failure of ['none', 'subject', 'nonce', 'audience', 'issuer', 'signature', 'browser', 'state']) {
    let nonce = '', challenge = '', exchangeCount = 0;
    const client = new oidc.Configuration({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`,
      id_token_signing_alg_values_supported: ['RS256'], response_types_supported: ['code'] }, 'studio-client', 'test-secret');
    client[oidc.customFetch] = async (url, options) => {
      if (String(url).endsWith('/jwks')) return Response.json({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }] });
      assert.ok(String(url).endsWith('/token'));
      exchangeCount++;
      const body = new URLSearchParams(String(options?.body));
      assert.equal(createHash('sha256').update(body.get('code_verifier')!).digest('base64url'), challenge);
      assert.equal(body.get('redirect_uri'), 'http://localhost:5173/api/auth/oidc/callback');
      return Response.json({ access_token: 'test-access', token_type: 'Bearer', expires_in: 300,
        id_token: jwt({ iss: failure === 'issuer' ? 'https://other.test' : issuer, sub: failure === 'subject' ? 'stranger' : 'owner-sub',
          aud: failure === 'audience' ? 'other-client' : 'studio-client', nonce: failure === 'nonce' ? 'wrong' : nonce,
          iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300, name: '站点作者' }, failure === 'signature') });
    };
    const app = createApp({ config: { origin: 'http://localhost:5173', secureCookies: false, sessionSecret: 'o'.repeat(32), sessionSeconds: 3600,
      oidc: { issuer, clientId: 'studio-client', clientSecret: 'test-secret', subjects: ['owner-sub'], label: 'OIDC' } },
      state: new FileState(join(root, failure)), repository: new LocalRepository(root), oidcDiscover: async () => client });
    const start = await app.request('/api/auth/oidc/start'); assert.equal(start.status, 302);
    const authorize = new URL(start.headers.get('location')!);
    nonce = authorize.searchParams.get('nonce')!; challenge = authorize.searchParams.get('code_challenge')!;
    assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
    const state = failure === 'state' ? 'unrelated-state-value-xxxxxxxxxxxx' : authorize.searchParams.get('state')!;
    const cookies = failure === 'browser' ? '' : start.headers.get('set-cookie')!.split(';')[0];
    const callback = `/api/auth/oidc/callback?code=test-code&state=${state}`;
    const response = await app.request(callback, { headers: { cookie: cookies } });
    if (failure === 'none') {
      assert.equal(response.headers.get('location'), '/');
      const sessionCookie = response.headers.getSetCookie().find(c => c.startsWith('studio-session='))!.split(';')[0];
      const session = await app.request('/api/auth/session', { headers: { cookie: sessionCookie } });
      assert.equal(session.status, 200); assert.equal((await session.json()).identity.name, '站点作者');
      assert.match((await app.request(callback, { headers: { cookie: cookies } })).headers.get('location')!, /failed/);
    } else {
      assert.match(response.headers.get('location')!, /login=(failed|denied)/, failure);
      assert.ok(!response.headers.getSetCookie().some(c => c.startsWith('studio-session=')), failure);
      if (failure === 'browser' || failure === 'state') assert.equal(exchangeCount, 0);
    }
  }
});
