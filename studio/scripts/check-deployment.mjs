import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../dist/makers/', import.meta.url);
const text = path => readFile(new URL(path, root), 'utf8');
try {
  const config = JSON.parse(await text('edgeone.json'));
  const source = JSON.parse(await readFile(new URL('../edgeone.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.headers, source.headers, 'security headers drifted');
  assert.deepEqual(config.cloudFunctions, source.cloudFunctions, 'function settings drifted');
  assert.equal(config.cloudFunctions.nodejs.maxDuration, 120);
  for (const key of ['buildCommand', 'installCommand', 'outputDirectory', 'nodeVersion']) assert.equal(config[key], undefined, 'prebuilt deploy must not build again');
  const pkg = JSON.parse(await text('package.json'));
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=20.19');
  const html = await text('index.html');
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) assert.ok((await stat(new URL(match[1].slice(1), root))).size > 0);
  assert.ok((await stat(new URL('vendor/vditor/dist/index.min.js', root))).size > 0);
  let bytes = 0;
  async function scan(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      assert.ok(!item.name.startsWith('.env') && !['.state', '.git', '.studio-history', '.studio-write-lock', 'node_modules'].includes(item.name), 'private/unnecessary file in artifact: ' + item.name);
      const path = join(directory, item.name);
      if (item.isDirectory()) await scan(path);
      else { assert.equal(item.isSymbolicLink(), false); bytes += (await stat(path)).size; }
    }
  }
  await scan(fileURLToPath(root));
  // A fake platform credential allows SDK construction only. No network call is allowed.
  const originalFetch = globalThis.fetch;
  const originalCredential = process.env.PAGES_BLOB_DEPLOY_CREDENTIAL;
  const originalProject = process.env.PAGES_PROJECT_ID;
  process.env.PAGES_BLOB_DEPLOY_CREDENTIAL = 'local-contract-check-not-a-real-credential';
  delete process.env.PAGES_PROJECT_ID;
  globalThis.fetch = async () => { throw new Error('Deployment check must not contact a network service'); };
  try {
    const entry = await import(new URL('cloud-functions/api/[[default]].js', root));
    const handler = entry.default;
    assert.equal(typeof handler, 'function', 'Cloud Function default handler missing');
    assert.equal(typeof entry.onRequest, 'function', 'Named onRequest export missing: the platform scanner ignores default-only bundle aliases');
    assert.equal(entry.onRequest, handler, 'Named and default cloud handlers must match');
    const env = { STUDIO_ORIGIN: 'https://studio.example', STUDIO_STATE: 'blob', STUDIO_GIT_URL: 'https://git.example/repo.git',
      STUDIO_GIT_TOKEN: 'dummy-git-token', STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_ADMIN_USER: 'owner',
      STUDIO_ADMIN_PASSWORD_HASH: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}`, STUDIO_OIDC_ISSUER: '' };
    assert.equal((await handler({ request: new Request('https://studio.example/api/auth/config'), env: { ...env, STUDIO_STATE: 'file' } })).status, 503);
    const response = await handler({ request: new Request('https://studio.example/api/auth/config'), env });
    assert.equal(response.status, 200, 'configured cloud handler did not initialize');
    assert.deepEqual(await response.json(), { password: true, oidc: null });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await handler({ request: new Request('https://studio.example/api/content'), env })).status, 401);
    assert.equal((await handler({ request: new Request('https://studio.example/api/media/upload', { method: 'POST' }), env })).status, 401);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalCredential === undefined) delete process.env.PAGES_BLOB_DEPLOY_CREDENTIAL; else process.env.PAGES_BLOB_DEPLOY_CREDENTIAL = originalCredential;
    if (originalProject === undefined) delete process.env.PAGES_PROJECT_ID; else process.env.PAGES_PROJECT_ID = originalProject;
  }
  console.log(`PASS: prebuilt Makers artifact (${(bytes / 1024 / 1024).toFixed(1)} MiB), static assets, deployment settings, default handler and unauthenticated API protection.`);
  console.log('Not tested: real Blob credentials, OIDC login, Git push, platform routing or deployment. Complete the live checks in docs/deploy-edgeone.zh-CN.md.');
} catch (error) {
  console.error('Deployment artifact check failed. Run npm run build first.');
  console.error(error instanceof Error ? error.message : 'Unknown check failure');
  process.exitCode = 1;
}
