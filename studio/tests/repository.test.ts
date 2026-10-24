import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRepository } from '../server/repository.js';

test('local repository persists content and rejects stale versions across instances', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const a = new LocalRepository(root), b = new LocalRepository(root);
  await a.write('content/articles/hello/index.md', 'one', null);
  const snapshot = await b.read('content/articles/hello/index.md');
  assert.equal(snapshot?.text, 'one');
  await a.write(snapshot!.path, 'two', snapshot!.revision);
  await assert.rejects(b.write(snapshot!.path, 'stale', snapshot!.revision), /已更新/);
  assert.equal((await a.read(snapshot!.path))?.text, 'two');
});
test('rejects path traversal, secrets and symlink escapes for both read and write', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-path-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'content/articles'), { recursive: true });
  await symlink(tmpdir(), join(root, 'content/articles/out'));
  const repo = new LocalRepository(root);
  for (const path of ['../config.toml', '.env', 'content/articles/../../config.toml', 'content/articles/out/secret.md', 'content/articles/.hidden.md', 'content/articles/a\\b.md']) {
    await assert.rejects(repo.read(path), /路径|链接/);
    await assert.rejects(repo.write(path, 'x', null), /路径|链接/);
  }
});
test('only one concurrent save from the same base succeeds', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-race-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'config.toml'), 'title="old"');
  const a = new LocalRepository(root), b = new LocalRepository(root);
  const snapshot = (await a.read('config.toml'))!;
  const results = await Promise.allSettled([a.write('config.toml', 'title="a"', snapshot.revision), b.write('config.toml', 'title="b"', snapshot.revision)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(await readFile(join(root, 'config.toml'), 'utf8'), /title="[ab]"/);
});
test('history backup cannot follow a symlink outside the repository', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-history-'));
  const outside = await mkdtemp(join(tmpdir(), 'studio-outside-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); });
  await writeFile(join(root, 'config.toml'), 'title="old"');
  await symlink(outside, join(root, '.studio-history'));
  const repo = new LocalRepository(root), before = (await repo.read('config.toml'))!;
  await assert.rejects(() => repo.write('config.toml', 'title="new"', before.revision), /链接/);
  assert.equal((await repo.read('config.toml'))!.text, before.text);
});
