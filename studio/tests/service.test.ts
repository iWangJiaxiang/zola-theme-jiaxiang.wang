import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'smol-toml';
import { ContentService } from '../server/content-service.js';
import { LocalRepository } from '../server/repository.js';
import { patchToml, splitDocument } from '../server/content.js';
import { settingsSchemas } from '../shared/settings.js';
import { pageSettingsSchemas } from '../shared/page-settings.js';
import { sortLibrary } from '../shared/library.js';
test('inserting fields keeps trailing comments on their original line', () => {
  const source = '[extra]\ncover="x" # cover explanation\n[other]\nname="y"\n';
  const result = patchToml(source, { 'extra.enabled': true });
  assert.ok(result.includes('cover="x" # cover explanation\n'));
  assert.equal((parse(result).extra as any).enabled, true);
});
test('all real theme settings load and unrelated TOML survives edits', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-real-')); t.after(() => rm(root, { recursive: true, force: true }));
  for (const path of ['config.toml', 'data.toml', 'static/data/friends.json']) { await mkdir(join(root, path, '..'), { recursive: true }); await cp(new URL(`../../${path}`, import.meta.url), join(root, path)); }
  const content = new ContentService(new LocalRepository(root));
  for (const schema of settingsSchemas) {
    const before = await content.settings(schema.id);
    const first = schema.fields[0];
    const value = before.values[first.path];
    const change = typeof value === 'string' ? first.path.endsWith('_skin') ? '#123456' : value + ' updated' : value;
    await content.saveSettings(schema.id, { [first.path]: change }, before.revision);
    assert.deepEqual((await content.settings(schema.id)).values[first.path], change);
  }
  parse(await readFile(join(root, 'config.toml'), 'utf8')); parse(await readFile(join(root, 'data.toml'), 'utf8'));
});
test('new collection entries require a parent and keep their rendering templates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-sections-')); t.after(() => rm(root, { recursive: true, force: true }));
  const repo = new LocalRepository(root), content = new ContentService(repo);
  const changes = { title: 'Tutorial', template: 'page/collection-detail.html', page_template: 'page/collection-content.html', render: true, insert_anchor_links: 'heading' };
  await assert.rejects(() => content.saveDocument('content/collections/docs/tutorial/_index.md', changes, '', null), /上级/);
  await mkdir(join(root, 'content/collections/docs'), { recursive: true });
  await writeFile(join(root, 'content/collections/docs/_index.md'), '+++\ntitle="Docs"\n+++\n');
  await content.saveDocument('content/collections/docs/tutorial/_index.md', changes, '# Content', null);
  const parsed = parse(splitDocument((await repo.read('content/collections/docs/tutorial/_index.md'))!.text).header);
  assert.equal((parsed.extra as any).cover, '/img/default-cover.webp');
  assert.equal(parsed.page_template, 'page/collection-content.html'); assert.equal(parsed.draft, true);
});
test('new published articles include theme-required taxonomies and a date', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-new-')); t.after(() => rm(root, { recursive: true, force: true }));
  const content = new ContentService(new LocalRepository(root));
  await content.saveDocument('content/articles/new/index.md', { title: 'New', draft: false }, '# New', null);
  const metadata = (await content.document('content/articles/new/index.md')).metadata;
  assert.deepEqual(metadata.taxonomies, { tags: [], categories: [] });
  assert.match(String(metadata.date), /^\d{4}-\d{2}-\d{2}/);
});

test('new standalone pages use the theme page template', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-page-')); t.after(() => rm(root, { recursive: true, force: true }));
  const content = new ContentService(new LocalRepository(root));
  await content.saveDocument('content/pages/new.md', { title: 'Page', draft: false }, '# Page', null);
  assert.equal((await content.document('content/pages/new.md')).metadata.template, 'page/empty.html');
});

test('template settings update the intended TOML file, preserve neighbors and reject stale shared config', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-template-')); t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'config.toml'), '# keep header\ntitle="Original"\n[extra.equipment]\nbig_title="Gear"\ncustom="keep me"\n[extra.tool.nav_music]\nid="old-playlist"\n');
  await writeFile(join(root, 'data.toml'), '# keep data\n[post]\ntags=[]\n[equipment]\ngroups=[]\n');
  const content = new ContentService(new LocalRepository(root));
  for (const schema of pageSettingsSchemas) assert.equal((await content.settings(schema.id)).fields.length, schema.fields.length);
  const gear = await content.settings('page-equipment-header'), music = await content.settings('page-music');
  await content.saveSettings(gear.id, { 'extra.equipment.big_title': 'New gear' }, gear.revision);
  const raw = await readFile(join(root, 'config.toml'), 'utf8');
  assert.ok(raw.startsWith('# keep header')); assert.ok(raw.includes('custom="keep me"')); assert.ok(raw.includes('id="old-playlist"'));
  await assert.rejects(() => content.saveSettings(music.id, { 'extra.tool.nav_music.id': 'new' }, music.revision), /文件已更新/);
  const data = await content.settings('page-equipment-items');
  await content.saveSettings(data.id, { 'equipment.groups': [{ name: 'Devices', description: '', items: [{ name: 'Laptop', img: '/laptop.png', model: 'M', description: 'Daily' }] }] }, data.revision);
  const savedData = await readFile(join(root, 'data.toml'), 'utf8');
  assert.ok(savedData.startsWith('# keep data')); assert.ok(savedData.includes('Laptop'));
  assert.equal(await readFile(join(root, 'config.toml'), 'utf8'), raw);
  await assert.rejects(() => content.saveSettings(data.id, { 'extra.equipment.big_title': 'Wrong file' }, ''), /不允许修改/);
});

test('list normalizes native TOML dates and string dates before chronological sorting', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-dates-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'content/articles'), { recursive: true });
  await writeFile(join(root, 'content/articles/old.md'), '+++\ntitle="Old"\ndate=2024-12-17\n+++\n');
  await writeFile(join(root, 'content/articles/new.md'), '+++\ntitle="New"\ndate="2026-10-24"\n+++\n');
  const content = new ContentService(new LocalRepository(root));
  const items = sortLibrary(await content.list(), 'article');
  assert.deepEqual(items.map(item => item.title), ['New', 'Old']);
  assert.deepEqual(items.map(item => item.date.slice(0, 10)), ['2026-10-24', '2024-12-17']);
});

test('date clearing keeps optional fields valid and prevents removing required publication dates', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-calendar-')); t.after(() => rm(root, { recursive: true, force: true }));
  const content = new ContentService(new LocalRepository(root));
  await content.saveDocument('content/articles/calendar/index.md', { title: 'Calendar', date: '2026-10-24T10:20:30+08:00', updated: '2026-10-25' }, '# Calendar', null);
  const article = await content.document('content/articles/calendar/index.md');
  assert.equal(article.metadata.date, '2026-10-24T10:20:30+08:00');
  await assert.rejects(() => content.saveDocument(article.path, { date: '' }, article.body, article.revision), /需要发布时间/);
  await content.saveDocument(article.path, { updated: '' }, article.body, article.revision);
  assert.equal(Object.hasOwn((await content.document(article.path)).metadata, 'updated'), false);
  await assert.rejects(() => content.saveDocument('content/articles/invalid/index.md', { title: 'Invalid', date: '2026-02-30' }, '', null), /有效的日期/);
});
