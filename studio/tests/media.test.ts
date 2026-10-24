import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalRepository } from '../server/repository.js';
import { validateMediaPath } from '../server/media-files.js';
import { MediaCheckout } from '../server/media-checkout.js';
import { isImageField, isBackupImageField, mediaValue, storedMediaPath, markdownImage, type MediaItem } from '../shared/media.js';

test('media scan and reads preserve binary images, isolate scope and reject symlinks', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-media-')); t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['static/img', 'content/articles/demo', 'static/.private', 'static/processed_images']) await mkdir(join(root, path), { recursive: true });
  const bytes = Buffer.from([0, 255, 128, 1, 254]);
  await writeFile(join(root, 'static/img/中文 配图.PNG'), bytes);
  await writeFile(join(root, 'content/articles/demo/cover.avif'), bytes);
  await writeFile(join(root, 'static/.private/secret.png'), bytes);
  await writeFile(join(root, 'static/processed_images/generated.png'), bytes);
  await writeFile(join(root, 'static/img/settings.json'), '{"secret":"hidden"}');
  await symlink(join(root, 'static/img/中文 配图.PNG'), join(root, 'static/img/linked.png'));
  await symlink(join(root, 'static/img'), join(root, 'content/articles/linked'));
  const repo = new LocalRepository(root);
  assert.deepEqual((await repo.listMedia()).items.map(item => item.path), ['static/img/中文 配图.PNG', 'content/articles/demo/cover.avif']);
  assert.deepEqual(Buffer.from((await repo.readMedia('static/img/中文 配图.PNG'))!.data), bytes);
  assert.equal((await repo.readMedia('static/img/中文 配图.PNG'))!.mime, 'image/png');
  assert.equal(await repo.readMedia('static/img/missing.png'), null);
  await assert.rejects(() => repo.readMedia('static/img/linked.png'), /符号链接/);
  await assert.rejects(() => repo.readMedia('content/articles/linked/中文 配图.PNG'), /符号链接/);
  for (const path of ['.env', 'config.toml', '../secret.png', 'static/../config.png', 'static/.secrets.png', 'static/img/a%2f.png', 'static/img/a.svg?x=1', 'static/img/settings.json', 'other/image.png']) assert.throws(() => validateMediaPath(path));
});

test('media paths respect global and colocated field semantics', () => {
  const item = (path: string): MediaItem => ({ path, name: path.split('/').at(-1)!, directory: path.slice(0, path.lastIndexOf('/')), size: 123, mime: 'image/png' });
  const shared = item('static/img/中文 配图.png'), local = item('content/articles/demo/cover.png'), other = item('content/articles/other/cover.png');
  assert.equal(mediaValue(shared, 'public'), '/img/中文 配图.png');
  assert.equal(mediaValue(shared, 'colocated', 'content/articles/demo/index.md'), null);
  assert.equal(mediaValue(local, 'colocated', 'content/articles/demo/index.md'), 'cover.png');
  assert.equal(mediaValue(local, 'document', 'content/articles/demo/_index.md'), 'cover.png');
  for (const mode of ['colocated', 'document'] as const) {
    assert.equal(mediaValue(local, mode, 'content/articles/demo/story.md'), null);
    assert.equal(storedMediaPath('cover.png', mode, 'content/articles/demo/story.md'), null);
  }
  assert.equal(mediaValue(shared, 'document', 'content/articles/demo/story.md'), '/img/中文 配图.png');
  assert.equal(mediaValue(other, 'colocated', 'content/articles/demo/index.md'), null);
  assert.equal(mediaValue(local, 'public'), null);
  assert.equal(storedMediaPath('cover.png', 'colocated', 'content/articles/demo/index.md'), local.path);
  assert.equal(storedMediaPath('/img/中文 配图.png', 'public'), shared.path);
  assert.equal(storedMediaPath('https://cdn.example/image.png', 'public'), null);
  assert.equal(storedMediaPath('//cdn.example/image.png', 'public'), null);
  assert.equal(markdownImage(shared, '/img/中文 配图.png'), '![中文 配图.png](/img/%E4%B8%AD%E6%96%87%20%E9%85%8D%E5%9B%BE.png)');
});

test('image field registry covers nested aliases without turning links or colors into images', () => {
  for (const path of ['extra.cover', 'extra.global_cover', 'extra.site.default_cover', 'extra.site.author.about_image', 'extra.site.favicon', 'extra.wechat.qrcode', 'extra.about.photos.0.url', 'extra.about.careers.bg', 'extra.about.hobbies.0.bg_url', 'extra.about.hobby.loading_bar', 'extra.about.map.backgroundDark', 'extra.about_reward.reward.wxPay', 'equipment.groups.0.items.0.img', 'friend.groups.0.items.0.local_logo', 'groups.0.links.0.logo', 'skill.svg_sprite']) assert.equal(isImageField(path), true, path);
  for (const path of ['extra.about.careers.tags.0.background', 'extra.style.theme_light_skin', 'friend.groups.0.items.0.url', 'equipment.groups.0.items.0.button_url', 'extra.wechat.help_url', 'skill.items.0.bg_color']) assert.equal(isImageField(path), false, path);
});

test('only friend backup logos suppress automatic previews for JSON and TOML', () => {
  for (const path of ['groups.0.links.0.logo', 'groups.12.links.23.logo', 'friend.groups.0.items.0.logo']) assert.equal(isBackupImageField(path), true, path);
  for (const path of ['groups.0.links.0.local_logo', 'friend.groups.0.items.0.local_logo', 'extra.site.logo', 'extra.site.favicon', 'equipment.groups.0.items.0.logo', 'extra.cover']) assert.equal(isBackupImageField(path), false, path);
});

test('media checkout shares concurrent reads and safely retires snapshots on refresh', async () => {
  let created = 0; const disposed: number[] = [];
  const cache = new MediaCheckout(async () => ++created, async id => { disposed.push(id); }, 60_000);
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const first = cache.use(async id => { await blocked; return id; });
  assert.deepEqual(await Promise.all([cache.use(async id => id), cache.use(async id => id)]), [1, 1]);
  assert.equal(await cache.use(async id => id, true), 2);
  assert.deepEqual(disposed, [], 'refresh cannot remove an active reader snapshot');
  release(); assert.equal(await first, 1); await Promise.resolve();
  assert.deepEqual(disposed, [1]);
  cache.clear(); await Promise.resolve(); assert.deepEqual(disposed, [1, 2]);
});

test('Markdown insertion escapes parentheses so legal image filenames stay intact', async () => {
  const { marked } = await import('marked');
  for (const name of ['a).png', 'a(.png', 'a(b).png']) {
    const item: MediaItem = { path: 'static/img/' + name, name, directory: 'static/img', size: 1, mime: 'image/png' };
    const source = markdownImage(item, '/img/' + name);
    const html = marked.parse(source, { async: false });
    assert.match(html, /<img /);
    assert.ok(html.includes('src="/img/' + name.replaceAll('(', '%28').replaceAll(')', '%29') + '"'));
  }
});
