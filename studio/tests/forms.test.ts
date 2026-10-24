import test from 'node:test';
import assert from 'node:assert/strict';
import { dateParts, updateDate, fieldControl, fieldChoices, newItem, mergeDefaults, localDate } from '../shared/form-fields.js';
import { fillFieldDefaults } from '../shared/form-defaults.js';
import { formDocumentMetadata } from '../server/content.js';

test('date controls retain wall time, fractional seconds and the original offset', () => {
  const original = '2026-10-24T09:12:34.123456+08:00';
  assert.equal(updateDate(original, 'date', '2026-10-25'), '2026-10-25T09:12:34.123456+08:00');
  assert.equal(updateDate(original, 'time', '10:20:00'), '2026-10-24T10:20:00+08:00');
  assert.equal(updateDate(original, 'time', ''), '2026-10-24');
  assert.equal(updateDate(original, 'date', ''), '');
  assert.equal(updateDate('', 'time', '10:20'), '');
  assert.equal(dateParts('invalid'), null);
  assert.equal(updateDate('2026-10-24 09:12:00Z', 'date', '2026-10-25'), '2026-10-25 09:12:00Z');
  assert.equal(localDate(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
});
test('native TOML dates retain their calendar day, timezone, and precision for editing', () => {
  const data = formDocumentMetadata('title="A"\ndate=2026-10-24T00:30:12.123456+08:00\nupdated=2026-10-25\n[extra]\ndate="untouched"\n');
  assert.equal(data.date, '2026-10-24T00:30:12.123456+08:00');
  assert.equal(data.updated, '2026-10-25');
});
test('field semantics distinguish colors from background images and preserve domain IDs', () => {
  assert.equal(fieldControl('extra.about.careers.tags.0.background'), 'color');
  assert.equal(fieldControl('extra.about.map.background'), 'text');
  assert.equal(fieldControl('skill.items.0.svg_symbol_id'), 'symbol');
  assert.equal(fieldControl('extra.about.author_info_left_tags.0'), 'emoji');
  assert.equal(fieldChoices('extra.style.color_scheme')?.length, 3);
  assert.deepEqual(fieldChoices('menu.nav_menu.0.menus.0.target')?.map(v => v.value), ['_self', '_blank']);
  assert.equal(fieldChoices('extra.about.widget_list.0')?.length, 9);
});
test('missing nested defaults are filled without replacing explicit false, zero, empty, or custom values', () => {
  assert.deepEqual(mergeDefaults({ enabled: false, count: 0, title: '', nested: { custom: 'keep' } }, { enabled: true, count: 5, title: 'default', nested: { text: 'hello' } }), { enabled: false, count: 0, title: '', nested: { text: 'hello', custom: 'keep' } });
  const equipment = fillFieldDefaults('equipment.groups', [{ name: 'Devices', items: [{ name: 'Laptop', button_title: '', custom: 42 }] }], []);
  assert.deepEqual(equipment, [{ name: 'Devices', description: '', items: [{ name: 'Laptop', img: '', model: '', description: '', button_title: '', button_url: '', custom: 42 }] }]);
  assert.deepEqual(fillFieldDefaults('skill.items', [{ name: 'Python', svg_symbol_id: 'python' }], []), [{ name: 'Python', bg_color: '#425AEF', svg_symbol_id: 'python' }]);
  assert.equal(Object.hasOwn(newItem('skill.items', '') as object, 'svg_sprite'), false, 'do not shadow inherited sprite with an empty string');
  assert.equal(Object.hasOwn(newItem('friend.groups.0.items', '') as object, 'local_logo'), false, 'do not shadow logo fallback with an empty local_logo');
});
test('new entries use clean defaults instead of copying another person or URL', () => {
  assert.deepEqual(newItem('custom.array', '', { name: 'Alice', url: 'https://alice.example', amount: 8, flag: true }), { name: '', url: '', amount: 0, flag: false });
  assert.equal((newItem('extra.about_reward.sponsors', '2026-10-24') as Record<string, unknown>).date, '2026-10-24');
});

test('link choices use public routes, respect explicit paths and distinguish bundle slugs from filenames', async () => {
  const { contentLink } = await import('../shared/content-links.js');
  const config = { slugify: { paths: 'safe', paths_keep_dates: false } };
  assert.equal(contentLink('content/articles/docs/01 Read Me/index.md', { slug: 'readme' }, config).publicPath, '/articles/docs/readme/');
  assert.equal(contentLink('content/collections/歌鸣 盛世/_index.md', {}, config).publicPath, '/collections/歌鸣 盛世/');
  assert.equal(contentLink('content/articles/2026-10-24-story.md', {}, config).publicPath, '/articles/story/');
  assert.equal(contentLink('content/pages/about.md', { path: 'about' }, config).publicPath, '/about/');
  assert.equal(contentLink('content/articles/你好.md', {}, {}).publicPath, undefined);
});

test('clearing a document date removes the field rather than writing an invalid empty datetime', async () => {
  const { updateDocument, splitDocument } = await import('../server/content.js');
  const { parse } = await import('smol-toml');
  const source = '+++\ntitle="Date test"\ndate=2026-10-24 # publication\nupdated="2026-10-25"\n[extra]\ndate="custom date"\n+++\nBody';
  const result = updateDocument(source, { date: '', updated: '' }, 'Body');
  const metadata = parse(splitDocument(result).header);
  assert.equal(Object.hasOwn(metadata, 'date'), false);
  assert.equal(Object.hasOwn(metadata, 'updated'), false);
  assert.equal((metadata.extra as Record<string, unknown>).date, 'custom date');
  assert.ok(result.includes('# publication'));
});
