import test from 'node:test';
import assert from 'node:assert/strict';
import { taxonomyChoices, collectionChoices, stringValues } from '../shared/choices.js';
import type { ArticleSummary } from '../shared/types.js';

test('taxonomy selections display dictionary labels but retain IDs and unregistered legacy terms', () => {
  assert.deepEqual(taxonomyChoices([{ id: 'tech', name: '技术' }, { id: 'music', name: '音乐' }, { name: 'missing id' }, null], ['tech', 'legacy', 'legacy']), [
    { value: 'tech', label: '技术' }, { value: 'music', label: '音乐' }, { value: 'legacy', label: 'legacy' },
  ]);
  assert.deepEqual(taxonomyChoices(undefined, []), []);
  assert.deepEqual(stringValues(['a', false, null, 2, '', 'b']), ['a', 'b']);
});

test('collection selectors use existing sections with readable hierarchy and allow Chinese/space paths', () => {
  const item = (path: string, title: string, template?: string, error?: string): ArticleSummary => ({ path: `content/collections/${path}`, title, template, error, kind: 'collection', draft: false, date: '', tags: [], categories: [] });
  const items = [item('_index.md', '合集'), item('album/_index.md', '音乐专辑', 'page/collection-list.html'),
    item('album/歌鸣 盛世/_index.md', '歌鸣盛世', 'page/collection-detail.html'), item('album/歌鸣 盛世/song.md', '歌曲'),
    item('album/歌鸣 盛世/part/_index.md', '第二部分'), item('broken/_index.md', '损坏', undefined, 'invalid')];
  assert.deepEqual(collectionChoices(items, true), [
    { value: 'album/歌鸣 盛世', label: '音乐专辑 / 歌鸣盛世' },
    { value: 'album/歌鸣 盛世/part', label: '音乐专辑 / 歌鸣盛世 / 第二部分' },
  ]);
  assert.equal(collectionChoices(items).length, 3);
  assert.deepEqual(collectionChoices([], true), []);
});
