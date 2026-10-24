import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArticleSummary } from '../shared/types.js';
import { collectionRoot, displayTitle, isLibraryItem, parentSection, sectionTrail, sortLibrary } from '../shared/library.js';
import { pageProfile } from '../shared/page-settings.js';

const item = (path: string, title = '', extra: Partial<ArticleSummary> = {}): ArticleSummary => ({ path, title, kind: 'collection', date: '', tags: [], categories: [], draft: false, ...extra });

test('library omits structural roots without discarding real sections or document bundles', () => {
  assert.equal(isLibraryItem(item('content/articles/2026/_index.md', '', { kind: 'article' })), false);
  assert.equal(isLibraryItem(item('content/pages/_index.md', '', { kind: 'page' })), false);
  assert.equal(isLibraryItem(item(collectionRoot)), false);
  assert.equal(isLibraryItem(item('content/collections/中文/_index.md')), true);
  assert.equal(isLibraryItem(item('content/articles/中文/index.md', '', { kind: 'article' })), true);
  assert.equal(displayTitle(item('content/collections/中文/_index.md', '中文/_index.md')), '中文');
});

test('collection navigation attaches bundle chapters to their nearest real section', () => {
  const root = item(collectionRoot), column = item('content/collections/专栏/_index.md', '专栏');
  const collection = item('content/collections/专栏/合集 1/_index.md', '合集一');
  const chapter = item('content/collections/专栏/合集 1/第一章/index.md', '第一章');
  const sibling = item('content/collections/专栏/合集 10/_index.md', '其他合集');
  const all = [root, column, collection, chapter, sibling];
  assert.equal(parentSection(column, all), root.path);
  assert.equal(parentSection(collection, all), column.path);
  assert.equal(parentSection(chapter, all), collection.path);
  assert.deepEqual(sectionTrail(chapter.path, all).map(item => item.title), ['专栏', '合集一']);
  assert.deepEqual(sortLibrary([chapter, collection], 'collection').map(item => item.title), ['合集一', '第一章']);
  assert.equal(sortLibrary([item('a', 'old', { date: '2020-01-01' }), item('b', 'new', { date: '2026-01-01' })], 'article')[0].title, 'new');
});

test('page templates expose different settings and ordinary pages remain content-driven', () => {
  assert.deepEqual(pageProfile('page/equipment.html').groups.map(group => group.id), ['page-equipment-header', 'page-equipment-items']);
  assert.ok(pageProfile('page/about.html').groups.some(group => group.id === 'page-about-skills'));
  assert.deepEqual(pageProfile('page/music.html').groups.map(group => group.id), ['page-music']);
  assert.equal(pageProfile('page/empty.html', '# Privacy').groups.length, 0);
  assert.deepEqual(pageProfile('page/empty.html', '{{ subscribe_list() }}').groups.map(group => group.id), ['page-subscribe']);
  assert.equal(pageProfile('custom.html').groups.length, 0);
});
