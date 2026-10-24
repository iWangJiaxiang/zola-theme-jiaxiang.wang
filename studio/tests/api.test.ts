import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';
import { LocalRepository } from '../server/repository.js';
import { FileState } from '../server/state.js';
import { hashPassword } from '../server/password.js';

const password = 'test-admin-long-password';
const hash = hashPassword(password);
async function fixture(t: test.TestContext, mediaLimit?: number, repositoryFactory = (root: string) => new LocalRepository(root)) {
  const root = await mkdtemp(join(tmpdir(), 'studio-api-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  await writeFile(join(root, 'config.toml'), '# keep\ntitle="Original"\nsecret="not-returned"\n[extra.style]\ntheme_light_skin="#425AEF"\n');
  await writeFile(join(root, 'data.toml'), '[menu]\nnav_menu=[]\n[post]\ntags=[]\ncategories=[]\n');
  await mkdir(join(root, 'content/articles/example'), { recursive: true });
  await writeFile(join(root, 'content/articles/example/index.md'), '+++\ntitle="Example"\ndraft=true\n[extra]\ncustom="keep"\n+++\n\n{{ image(src="cover.png") }}\n');
  const app = createApp({ config: { origin: 'http://localhost:5173', secureCookies: false, sessionSecret: 'x'.repeat(32),
    sessionSeconds: 3600, username: 'owner', passwordHash: await hash }, repository: repositoryFactory(root), state: new FileState(join(root, '.state')), mediaLimit });
  const login = () => app.request('/api/auth/login', { method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' }, body: JSON.stringify({ username: 'owner', password }) });
  return { app, root, login };
}
test('password sessions protect APIs, require CSRF and are revoked on logout', async t => {
  const { app, login } = await fixture(t);
  assert.equal((await app.request('/api/content')).status, 401);
  const logged = await login(); assert.equal(logged.status, 200);
  const cookie = logged.headers.get('set-cookie')!.split(';')[0];
  const session = await logged.json();
  assert.ok(session.csrf); assert.match(logged.headers.get('set-cookie')!, /HttpOnly/);
  assert.equal((await app.request('/api/content', { headers: { cookie } })).status, 200);
  assert.equal((await app.request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'http://evil.test' } })).status, 403);
  assert.equal((await app.request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'http://localhost:5173' } })).status, 403);
  assert.equal((await app.request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'http://localhost:5173', 'x-csrf-token': session.csrf } })).status, 200);
  assert.equal((await app.request('/api/content', { headers: { cookie } })).status, 401);
});
test('settings expose only allowed fields, persist one change and reject stale updates', async t => {
  const { app, root, login } = await fixture(t);
  const logged = await login(), session = await logged.json();
  const headers = { cookie: logged.headers.get('set-cookie')!.split(';')[0], origin: 'http://localhost:5173', 'x-csrf-token': session.csrf, 'content-type': 'application/json' };
  const settings = await (await app.request('/api/settings/site', { headers })).json();
  assert.equal(settings.values.title, 'Original');
  assert.equal(JSON.stringify(settings).includes('not-returned'), false);
  const save = () => app.request('/api/settings/site', { method: 'PUT', headers, body: JSON.stringify({ revision: settings.revision, changes: { title: 'Changed' } }) });
  assert.equal((await save()).status, 200);
  const raw = await readFile(join(root, 'config.toml'), 'utf8'); assert.ok(raw.includes('# keep')); assert.ok(raw.includes('secret="not-returned"'));
  assert.equal((await save()).status, 409);
  assert.equal((await app.request('/api/settings/site', { method: 'PUT', headers, body: JSON.stringify({ revision: settings.revision, changes: { secret: 'oops' } }) })).status, 400);
});
test('content editing preserves unknown metadata and rejects unrelated files', async t => {
  const { app, root, login } = await fixture(t);
  const logged = await login(), session = await logged.json();
  const headers = { cookie: logged.headers.get('set-cookie')!.split(';')[0], origin: 'http://localhost:5173', 'x-csrf-token': session.csrf, 'content-type': 'application/json' };
  const path = 'content/articles/example/index.md';
  const article = await (await app.request(`/api/document?path=${path}`, { headers })).json();
  assert.equal(article.metadata.title, 'Example');
  const response = await app.request('/api/document', { method: 'PUT', headers, body: JSON.stringify({ path, revision: article.revision, changes: { title: '新文章' }, body: article.body }) });
  assert.equal(response.status, 200);
  const raw = await readFile(join(root, path), 'utf8'); assert.ok(raw.includes('custom="keep"')); assert.ok(raw.includes('{{ image(src="cover.png") }}'));
  assert.equal((await app.request('/api/document?path=config.toml', { headers })).status, 400);
  assert.equal((await app.request('/api/document?path=content/articles/../../.env', { headers })).status, 400);
});
test('wrong passwords and missing origins are rejected and repeated login attempts are limited', async t => {
  const { app } = await fixture(t);
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'owner', password }) })).status, 403);
  const wrong = () => app.request('/api/auth/login', { method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' }, body: JSON.stringify({ username: 'owner', password: 'incorrect-password' }) });
  for (let n = 0; n < 5; n++) assert.equal((await wrong()).status, 401);
  assert.equal((await wrong()).status, 429);
});

test('media endpoints require login, serve exact bytes with safe headers and reject non-image paths', async t => {
  const { app, root, login } = await fixture(t);
  await mkdir(join(root, 'static/img'), { recursive: true });
  const image = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>throw Error("must not execute")</script></svg>');
  await writeFile(join(root, 'static/img/test.svg'), image);
  assert.equal((await app.request('/api/media')).status, 401);
  assert.equal((await app.request('/api/media/file?path=static/img/test.svg')).status, 401);
  const logged = await login(); const headers = { cookie: logged.headers.get('set-cookie')!.split(';')[0] };
  const listing = await (await app.request('/api/media', { headers })).json();
  assert.deepEqual(listing.items.map((item: { path: string }) => item.path), ['static/img/test.svg']);
  const preview = await app.request('/api/media/file?path=static/img/test.svg', { headers });
  assert.equal(preview.status, 200); assert.equal(preview.headers.get('content-type'), 'image/svg+xml');
  assert.equal(preview.headers.get('cache-control'), 'private, no-store');
  assert.match(preview.headers.get('content-security-policy')!, /sandbox/);
  assert.equal(preview.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), image);
  for (const path of ['config.toml', '.env', 'static/../config.toml', 'static/img/test.svg%00.png']) assert.equal((await app.request('/api/media/file?path=' + encodeURIComponent(path), { headers })).status, 400);
  assert.equal((await app.request('/api/media/file?path=static/img/missing.png', { headers })).status, 404);
});

test('image uploads require authentication and CSRF, support binary files above 1 MB and enforce limits', async t => {
  const { app, root, login } = await fixture(t);
  const path = '/api/media/upload?directory=static/uploads&filename=upload.png';
  const image = Buffer.alloc(1024 * 1024 + 100);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  assert.equal((await app.request(path, { method: 'POST', body: image })).status, 401);
  const logged = await login(), session = await logged.json();
  const cookie = logged.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await app.request(path, { method: 'POST', headers: { cookie, origin: 'http://localhost:5173' }, body: image })).status, 403);
  const headers = { cookie, origin: 'http://localhost:5173', 'x-csrf-token': session.csrf, 'content-type': 'application/octet-stream' };
  assert.equal((await app.request(path, { method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body: image })).status, 403);
  const response = await app.request(path, { method: 'POST', headers, body: image });
  assert.equal(response.status, 201);
  const saved = await response.json();
  assert.deepEqual(await readFile(join(root, saved.item.path)), image);
  const again = await (await app.request(path, { method: 'POST', headers, body: image })).json();
  assert.notEqual(again.item.path, saved.item.path);
  assert.equal((await app.request(path, { method: 'POST', headers, body: 'not an image' })).status, 400);
  assert.equal((await app.request(path.replace('static/uploads', 'static/../private'), { method: 'POST', headers, body: image })).status, 400);
  assert.equal((await app.request(path, { method: 'POST', headers, body: Buffer.alloc(20 * 1024 * 1024 + 1) })).status, 413);
  // A dishonest Content-Length cannot bypass streamed limits.
  assert.equal((await app.request(path, { method: 'POST', headers: { ...headers, 'content-length': '1' }, body: Buffer.alloc(20 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await app.request('/api/settings/site', { method: 'PUT', headers, body: image })).status, 413);
});


test('cloud media capability limits uploads and previews while preserving normal images', async t => {
  const maxSize = 4 * 1024 * 1024;
  const { app, root, login } = await fixture(t, maxSize);
  await mkdir(join(root, 'static/img'), { recursive: true });
  await writeFile(join(root, 'static/img/too-large.png'), Buffer.alloc(maxSize + 1));
  const logged = await login(), session = await logged.json();
  const headers = { cookie: logged.headers.get('set-cookie')!.split(';')[0], origin: 'http://localhost:5173', 'x-csrf-token': session.csrf };
  const listing = await (await app.request('/api/media', { headers })).json();
  assert.equal(listing.maxFileSize, maxSize);
  assert.ok(listing.items[0].unavailable);
  assert.equal((await app.request('/api/media/file?path=static/img/too-large.png', { headers })).status, 413);
  const path = '/api/media/upload?directory=static/uploads&filename=large.png';
  const rejected = await app.request(path, { method: 'POST', headers, body: Buffer.alloc(maxSize + 1) });
  assert.equal(rejected.status, 413);
  assert.deepEqual((await rejected.json()).params, { limit: 4 });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwinr/HwAE+AKLJh4rzQAAAABJRU5ErkJggg==', 'base64');
  assert.equal((await app.request(path, { method: 'POST', headers, body: png })).status, 201);
});


test('authenticated mutations refresh cached preflight reads before checking revisions', async t => {
  let clears = 0;
  class CachedRepository extends LocalRepository {
    private snapshots = new Map<string, Awaited<ReturnType<LocalRepository['read']>>>();
    override async read(path: string) {
      if (!this.snapshots.has(path)) this.snapshots.set(path, await super.read(path));
      return this.snapshots.get(path)!;
    }
    clearReadCache() { clears++; this.snapshots.clear(); }
  }
  const { app, root, login } = await fixture(t, undefined, root => new CachedRepository(root));
  const logged = await login(), session = await logged.json();
  const headers = { cookie: logged.headers.get('set-cookie')!.split(';')[0], origin: 'http://localhost:5173', 'x-csrf-token': session.csrf, 'content-type': 'application/json' };
  for (const item of [
    { file: 'config.toml', endpoint: '/api/settings/site', read: '/api/settings/site' },
    { file: 'content/articles/example/index.md', endpoint: '/api/document', read: '/api/document?path=content/articles/example/index.md' },
  ]) {
    const old = await (await app.request(item.read, { headers })).json();
    const raw = await readFile(join(root, item.file), 'utf8');
    await writeFile(join(root, item.file), raw.replace(/title="[^"]*"/, 'title="External edit"'));
    const latest = await new LocalRepository(root).read(item.file);
    const input = { path: item.file, revision: latest!.revision, changes: { title: 'Saved latest' }, body: 'Latest body' };
    const before = clears;
    assert.equal((await app.request(item.endpoint, { method: 'PUT', headers: { ...headers, 'x-csrf-token': '' }, body: JSON.stringify(input) })).status, 403);
    assert.equal(clears, before, 'unauthorized writes cannot invalidate snapshots');
    const saved = await app.request(item.endpoint, { method: 'PUT', headers, body: JSON.stringify(input) });
    assert.equal(saved.status, 200, 'a current revision must not be rejected by a stale instance cache');
    assert.match(await readFile(join(root, item.file), 'utf8'), /Saved latest/);
    assert.equal((await app.request(item.endpoint, { method: 'PUT', headers, body: JSON.stringify({ ...input, revision: old.revision }) })).status, 409, 'actually stale writes still conflict');
  }
});
