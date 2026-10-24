import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'smol-toml';
import { splitDocument } from '../../server/content.ts';

export async function checkUploads({ page, base, theme, screenshots, click, heading, fill }) {
  const source = base + '/upload-fixtures'; await mkdir(source);
  await cp(theme + '/static/img/logo.webp', source + '/上传 配图.webp');
  await writeFile(source + '/invalid.webp', 'not an image');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNwinr/HwAE+AKLJh4rzQAAAABJRU5ErkJggg==', 'base64');
  await writeFile(source + '/cover-upload.png', png);
  const upload = async files => { const input = await page.$('.upload-file-input'); await input.uploadFile(...files.map(file => source + '/' + file)); };
  const finished = () => page.waitForFunction(() => !document.querySelector('.upload-progress') && document.querySelector('.upload-results li'));
  const selected = () => page.$eval('.media-card.selected', el => el.dataset.mediaPath);
  await click('媒体库'); await heading('媒体库');
  await page.waitForFunction(() => !document.querySelector('.upload-file-input').disabled);
  await upload(['上传 配图.webp', 'invalid.webp']); await finished();
  assert.equal(await page.$$eval('.upload-results li', nodes => nodes.length), 2);
  assert.match(await page.$eval('.upload-error', el => el.textContent), /格式不匹配/);
  assert.equal(await selected(), 'static/uploads/上传 配图.webp');
  assert.deepEqual(await readFile(base + '/site/static/uploads/上传 配图.webp'), await readFile(source + '/上传 配图.webp'));
  await upload(['上传 配图.webp']); await finished();
  await page.waitForFunction(() => document.querySelector('.upload-results')?.textContent.includes('上传 配图-'));
  const renamed = await selected(); assert.match(renamed, /^static\/uploads\/上传 配图-[a-f0-9]+\.webp$/);
  assert.deepEqual(await readFile(base + '/site/' + renamed), await readFile(source + '/上传 配图.webp'));
  await page.screenshot({ path: screenshots + '/upload-library.png', fullPage: true });

  // Drag and drop uses the same upload path as the file chooser.
  await page.evaluate(bytes => {
    const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(bytes)], 'dragged.png', { type: 'image/png' }));
    document.querySelector('.media-upload').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, [...png]);
  await finished(); await page.waitForSelector('[data-media-path="static/uploads/dragged.png"]');
  assert.deepEqual(await readFile(base + '/site/static/uploads/dragged.png'), png);

  await click('站点信息'); await heading('站点信息');
  const original = await page.$eval('[name="extra.site.logo"]', el => el.value);
  await page.select('.language-switcher select', 'en');
  await heading('Site information');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
  await page.click('[data-image-field="extra.site.logo"] .secondary');
  await page.waitForSelector('dialog.media-dialog[open]');
  await upload(['cover-upload.png']); await finished();
  assert.equal(await selected(), 'static/uploads/cover-upload.png');
  assert.equal(await page.$eval('[name="extra.site.logo"]', el => el.value), original, 'upload does not change a form before confirmation');
  assert.match(await page.$eval('.upload-results', el => el.textContent), /Uploaded:/);
  assert.ok(await page.$eval('.media-dialog-body', el => el.scrollWidth <= el.clientWidth), 'upload controls fit a mobile dialog');
  await page.screenshot({ path: screenshots + '/upload-picker-mobile-en.png' });
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('[name="extra.site.logo"]', el => el.value), original, 'cancel leaves the form unchanged');
  assert.deepEqual(await readFile(base + '/site/static/uploads/cover-upload.png'), png, 'cancel retains the uploaded image');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.select('.language-switcher select', 'zh-CN');
  await page.click('[data-image-field="extra.site.logo"] .secondary');
  await page.waitForSelector('dialog.media-dialog[open]');
  await fill('dialog.media-dialog[open] [aria-label="搜索仓库图片"]', 'cover-upload.png');
  await page.waitForSelector('[data-media-path="static/uploads/cover-upload.png"]');
  await page.click('[data-media-path="static/uploads/cover-upload.png"]'); await click('使用这张图片');
  await click('保存更改'); await page.waitForSelector('.notice.success');
  assert.equal(parse(await readFile(base + '/site/config.toml', 'utf8')).extra.site.logo, '/uploads/cover-upload.png');

  await click('文章'); await heading('文章');
  await page.waitForSelector('[data-path="content/articles/studio-browser-test/index.md"]');
  await page.click('[data-path="content/articles/studio-browser-test/index.md"]');
  await page.waitForSelector('.markdown-source');
  await page.click('[data-image-field="extra.cover"] .secondary');
  await page.waitForSelector('dialog.media-dialog[open]');
  assert.equal(await page.$eval('.upload-destination', el => el.textContent), 'content/articles/studio-browser-test');
  await upload(['cover-upload.png']); await finished();
  assert.equal(await selected(), 'content/articles/studio-browser-test/cover-upload.png');
  await click('使用这张图片');
  assert.equal(await page.$eval('[name="extra.cover"]', el => el.value), 'cover-upload.png');
  await page.$eval('.markdown-source', el => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
  await click('插入图片'); await page.waitForSelector('dialog.media-dialog[open]');
  await upload(['上传 配图.webp']); await finished();
  assert.equal(await selected(), 'content/articles/studio-browser-test/上传 配图.webp');
  await click('使用这张图片'); await click('保存内容'); await page.waitForSelector('.editor-page > .notice.success');
  const saved = splitDocument(await readFile(base + '/site/content/articles/studio-browser-test/index.md', 'utf8'));
  assert.equal(parse(saved.header).extra.cover, 'cover-upload.png');
  assert.match(saved.body, /!\[上传 配图.webp\]\(%E4%B8%8A%E4%BC%A0%20%E9%85%8D%E5%9B%BE.webp\)/);
  assert.deepEqual(await readFile(base + '/site/content/articles/studio-browser-test/cover-upload.png'), png);
  // A cloud capability response must lower the client limit without changing the local server.
  await click('媒体库'); await heading('媒体库');
  await page.evaluate(() => {
    window.originalUploadTestFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await window.originalUploadTestFetch(...args);
      if (String(args[0]).startsWith('/api/media?')) {
        const data = await response.clone().json();
        return new Response(JSON.stringify({ ...data, maxFileSize: 4 * 1024 * 1024 }), { status: response.status, headers: response.headers });
      }
      return response;
    };
  });
  await click('刷新仓库');
  await page.waitForFunction(() => document.querySelector('.upload-actions')?.textContent.includes('4 MB'));
  await writeFile(source + '/cloud-too-large.png', Buffer.alloc(4 * 1024 * 1024 + 1));
  const uploadRequests = [];
  const track = request => { if (request.url().includes('/api/media/upload')) uploadRequests.push(request.url()); };
  page.on('request', track);
  await upload(['cloud-too-large.png']); await finished();
  assert.match(await page.$eval('.upload-error', el => el.textContent), /4 MB/);
  assert.deepEqual(uploadRequests, [], 'oversized cloud uploads must be rejected before sending');
  page.off('request', track);
  await page.evaluate(() => { window.fetch = window.originalUploadTestFetch; delete window.originalUploadTestFetch; });
  await click('刷新仓库');
  await page.waitForFunction(() => document.querySelector('.upload-actions')?.textContent.includes('20 MB'));
  console.log('PASS: batch and drag uploads, mixed failures, duplicate renaming, public and bundle paths, picker cancel/confirm, English mobile controls and saved cover/Markdown.');
}
