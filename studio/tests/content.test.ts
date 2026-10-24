import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { parse as parseToml } from 'smol-toml';
const parse = (text: string) => JSON.parse(JSON.stringify(parseToml(text)));
import { patchToml, splitDocument, updateDocument } from '../server/content.js';

test('patches one scalar without rewriting comments, unknown fields or multiline strings', () => {
  const source = '# title comment\ntitle = "Old" # inline\nunknown = 42\n[extra]\ntext = """hello\nworld"""\n';
  const result = patchToml(source, { title: '新标题' });
  assert.equal(result, source.replace('"Old"', '"新标题"'));
});
test('adds missing fields to the correct table without reparenting existing keys', () => {
  const result = patchToml('title="A"\n[extra]\ncover="x"\n[other]\nx=1\n', { description: 'D', 'extra.enabled': true, 'taxonomies.tags': ['a'] });
  assert.deepEqual(parse(result), { title: 'A', description: 'D', extra: { cover: 'x', enabled: true }, other: { x: 1 }, taxonomies: { tags: ['a'] } });
});
test('replaces an array of tables without removing adjacent tables or comments', () => {
  const source = '[post]\na=1\n[[post.tags]]\nid="old"\n# keep between\n[[post.tags]]\nid="two"\n# next section\n[menu]\nnav=[]\n';
  const result = patchToml(source, { 'post.tags': [{ id: 'new', name: '新标签', index: 1 }] });
  assert.deepEqual((parse(result).post as Record<string, unknown>).tags, [{ id: 'new', name: '新标签', index: 1 }]);
  assert.ok(result.includes('# next section\n[menu]\nnav=[]'));
});
test('preserves nested inline-table siblings when updating one member', () => {
  const result = patchToml('extra = { cover = "a", unknown = 12 }\n', { 'extra.cover': 'b' });
  assert.deepEqual(parse(result), { extra: { cover: 'b', unknown: 12 } });
});
test('rejects overlapping paths and prototype keys instead of corrupting TOML', () => {
  assert.throws(() => patchToml('', { 'extra': {}, 'extra.cover': 'x' }));
  assert.throws(() => patchToml('', { '__proto__.x': 'x' }));
});
test('Markdown roundtrip preserves shortcodes and TOML containing delimiter-like strings', () => {
  const source = '+++\ntitle="文章"\ndescription="""\n+++\ninside\n"""\n[extra]\ncustom=12\n+++\n\n{{ image(src="x.png") }}\n';
  const doc = splitDocument(source);
  assert.equal(doc.body, '\n{{ image(src="x.png") }}\n');
  assert.equal(updateDocument(source, {}, doc.body), source);
  assert.equal(updateDocument(source, { title: 'Changed' }, doc.body), source.replace('"文章"', '"Changed"'));
});
test('every theme sample Markdown document roundtrips unchanged', async () => {
  const base = new URL('../../content/', import.meta.url);
  const names = await readdir(base, { recursive: true });
  for (const name of names.filter(n => n.endsWith('.md'))) {
    const source = await readFile(new URL(name, base), 'utf8');
    assert.equal(updateDocument(source, {}, splitDocument(source).body), source, name);
  }
});
