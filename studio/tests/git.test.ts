import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GitRepository } from '../server/git-repository.js';

test('HTTPS Git adapter clones, pushes only edited paths and rejects stale revisions via smart HTTP', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const run = (args: string[], cwd = root) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();
  // The bare remote HEAD must match the seeded branch regardless of host defaults.
  run(['init', '--bare', '-b', 'main', 'repo.git']); run(['-C', 'repo.git', 'config', 'http.receivepack', 'true']);
  run(['init', '-b', 'main', 'seed']);
  await mkdir(join(root, 'seed/content/articles/first'), { recursive: true });
  await writeFile(join(root, 'seed/content/articles/first/index.md'), '+++\ntitle="First"\n+++\nHello\n');
  await writeFile(join(root, 'seed/config.toml'), 'title="Sample"\n');
  await mkdir(join(root, 'seed/static/img'), { recursive: true });
  const image = Buffer.from([0, 255, 128, 1, 254]);
  await writeFile(join(root, 'seed/static/img/git.png'), image);
  run(['add', '.'], join(root, 'seed')); run(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'initial'], join(root, 'seed'));
  run(['push', '../repo.git', 'main'], join(root, 'seed'));
  const executable = join(run(['--exec-path']), 'git-http-backend');
  let receivedAuth = false, cloneRequests = 0;
  const server = createServer(async (req, res) => {
    if (req.headers.authorization) receivedAuth = true;
    else { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm=Git' }).end(); return; }
    const url = new URL(req.url!, 'http://localhost');
    if (url.pathname.endsWith('/git-upload-pack')) cloneRequests++;
    const child = spawn(executable, [], { env: { ...process.env, GIT_PROJECT_ROOT: root, GIT_HTTP_EXPORT_ALL: '1',
      PATH_INFO: url.pathname, REQUEST_METHOD: req.method, QUERY_STRING: url.search.slice(1), CONTENT_TYPE: req.headers['content-type'] || '', REMOTE_USER: 'tester', REMOTE_ADDR: '127.0.0.1' } });
    const parts: Buffer[] = [];
    child.stdout.on('data', chunk => parts.push(chunk)); child.stderr.resume(); req.pipe(child.stdin);
    child.on('close', () => {
      const data = Buffer.concat(parts), end = data.indexOf('\r\n\r\n');
      if (end < 0) { res.writeHead(500).end(); return; }
      for (const line of data.subarray(0, end).toString().split('\r\n')) { const colon = line.indexOf(':'); const key = line.slice(0, colon), value = line.slice(colon + 1).trim(); if (key === 'Status') res.statusCode = Number(value.split(' ')[0]); else res.setHeader(key, value); }
      res.end(data.subarray(end + 4));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const port = (server.address() as { port: number }).port;
  const originalFetch = globalThis.fetch;
  // Transport substitution is confined to this test process. Production remains HTTPS-only.
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input)); assert.equal(url.origin, 'https://git.test');
    return originalFetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, init);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const repo = new GitRepository({ url: 'https://git.test/repo.git', branch: 'main', username: 'tester', token: 'test-token', name: 'Studio', email: 'studio@example.com' });
  t.after(() => repo.clearMediaCache());
  const before = cloneRequests;
  assert.equal((await repo.listMedia()).items[0].path, 'static/img/git.png');
  const pictures = await Promise.all([repo.readMedia('static/img/git.png'), repo.readMedia('static/img/git.png')]);
  for (const picture of pictures) assert.deepEqual(Buffer.from(picture!.data), image);
  assert.equal(cloneRequests - before, 1, 'media list and thumbnails share a single Git checkout');
  await repo.listMedia(true); assert.equal(cloneRequests - before, 2, 'refresh fetches the remote again');
  const first = await repo.read('content/articles/first/index.md'); assert.ok(first);
  assert.equal((await repo.list()).length, 1);
  const saved = await repo.write(first.path, first.text.replace('Hello', 'Updated'), first.revision);
  assert.ok(saved.commit); assert.ok(receivedAuth);
  assert.match((await repo.read(first.path))!.text, /Updated/);
  assert.equal((await repo.read('config.toml'))!.text, 'title="Sample"\n');
  await assert.rejects(() => repo.write(first.path, 'obsolete', first.revision), /已更新/);
  const paths = run(['--git-dir=repo.git', 'diff-tree', '--no-commit-id', '--name-only', '-r', saved.commit!]);
  assert.equal(paths, first.path);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwinr/HwAE+AKLJh4rzQAAAABJRU5ErkJggg==', 'base64');
  const uploaded = await repo.uploadMedia('static/uploads', '中文 图片.png', png);
  assert.ok(uploaded.commit);
  assert.deepEqual(execFileSync('git', ['--git-dir=repo.git', 'show', `main:${uploaded.item.path}`], { cwd: root }), png);
  assert.ok((await repo.listMedia()).items.some(item => item.path === uploaded.item.path), 'upload invalidates the existing cached checkout');
  assert.deepEqual(Buffer.from((await repo.readMedia(uploaded.item.path))!.data), png);
  const repeated = await repo.uploadMedia('static/uploads', '中文 图片.png', png);
  assert.notEqual(repeated.item.path, uploaded.item.path);
  assert.equal(run(['--git-dir=repo.git', '-c', 'core.quotePath=false', 'diff-tree', '--no-commit-id', '--name-only', '-r', repeated.commit!]), repeated.item.path);
  assert.equal((await repo.read('config.toml'))!.text, 'title="Sample"\n');
});
