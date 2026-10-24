import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalRepository } from '../server/repository.js';
import { validateUpload } from '../server/media-upload.js';
import { MAX_UPLOAD_SIZE } from '../shared/media.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwinr/HwAE+AKLJh4rzQAAAABJRU5ErkJggg==', 'base64');
test('uploads preserve binary bytes, rename collisions and become immediately readable', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-upload-')); t.after(() => rm(root, { recursive: true, force: true }));
  const repo = new LocalRepository(root);
  const results = await Promise.all(Array.from({ length: 3 }, () => repo.uploadMedia('static/uploads', '中文 配图.png', png)));
  assert.equal(new Set(results.map(result => result.item.path)).size, 3);
  assert.ok(results.some(result => result.item.name === '中文 配图.png'));
  for (const result of results) {
    assert.equal(result.item.mime, 'image/png');
    assert.deepEqual(await readFile(join(root, result.item.path)), png);
    assert.deepEqual(Buffer.from((await repo.readMedia(result.item.path))!.data), png);
  }
  const article = await repo.uploadMedia('content/articles/new-draft', 'cover.png', png);
  assert.equal(article.item.path, 'content/articles/new-draft/cover.png');
  assert.equal((await repo.listMedia()).items.length, 4);
});

test('uploads reject traversal, hidden/generated paths, mismatched types, empty and oversized files', () => {
  for (const folder of ['..', '/static', 'static/../outside', 'static/.git', 'static/public', 'static/node_modules', 'content', 'content/private', 'content/articles', 'content/articles/.draft']) {
    assert.throws(() => validateUpload(folder, 'cover.png', png), folder);
  }
  for (const name of ['../image.png', 'nested/image.png', '.secret.png', 'a%2F.png', 'a?.png', 'a\\b.png', 'a\n.png', 'a.html', 'a.constructor']) {
    assert.throws(() => validateUpload('static/uploads', name, png), name);
  }
  assert.throws(() => validateUpload('static/uploads', 'fake.png', Buffer.from('<html>fake</html>')), /格式/);
  assert.throws(() => validateUpload('static/uploads', 'empty.png', Buffer.alloc(0)), /空/);
  assert.throws(() => validateUpload('static/uploads', 'large.png', Buffer.alloc(MAX_UPLOAD_SIZE + 1)), /20 MB/);
});

test('uploads reject symlink destinations and active or malformed SVG without altering safe SVG', async t => {
  const root = await mkdtemp(join(tmpdir(), 'studio-svg-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'static')); await mkdir(join(root, 'outside'));
  await symlink(join(root, 'outside'), join(root, 'static/linked'));
  const repo = new LocalRepository(root);
  await assert.rejects(() => repo.uploadMedia('static/linked', 'cover.png', png), /符号链接/);
  const safe = '<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="p" d="M0 0"/></defs><use href="#p" style="fill:rgb(20, 30, 40);stroke-width:2;opacity:.5"/></svg>';
  const saved = await repo.uploadMedia('static/uploads', 'icons.svg', Buffer.from(safe));
  assert.equal((await readFile(join(root, saved.item.path))).toString(), safe);
  for (const source of ['<svg>', '<html/>', '<!DOCTYPE svg><svg/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="&#106;avascript:alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/track"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "https://example.com";</style></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><set attributeName="href" to="javascript:alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" style="background-image:image-set(\'/beacon.png\' 1x)"/>',
    '<svg xmlns="http://www.w3.org/2000/svg" style="background-image:image-set(\'//example.com/beacon.png\' 1x)"/>',
    '<?xml-stylesheet href="https://example.com/x.css"?><svg xmlns="http://www.w3.org/2000/svg"/>']) {
    assert.throws(() => validateUpload('static/uploads', 'bad.svg', Buffer.from(source)), /SVG/);
  }
});

test('AVIF accepts compatible brands within the declared ftyp box', async () => {
  const avif = await readFile(new URL('../../static/img/wechat/qr.avif', import.meta.url));
  avif.write('mif1', 8, 'ascii');
  assert.doesNotThrow(() => validateUpload('static/uploads', 'image.avif', avif));
  const outside = Buffer.alloc(24);
  outside.writeUInt32BE(16); outside.write('ftypmif1', 4, 'ascii'); outside.write('avif', 16, 'ascii');
  assert.throws(() => validateUpload('static/uploads', 'invalid.avif', outside), /格式/);
});
