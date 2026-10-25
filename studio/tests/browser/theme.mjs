import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

// Load generated pages and execute their production scripts, rather than only parsing HTML.
export async function checkRenderedTheme({ browser, base, screenshots }) {
  const root = resolve(base, 'site/public');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    try {
      let file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      res.end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let page;
  try {
    page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(origin + '/') || request.url().startsWith('data:') ? request.continue() : request.abort());
    await page.setViewport({ width: 1280, height: 800 });
    for (const path of ['wechat', 'subscribe', 'articles/studio-regression', 'articles/studio-browser-test']) {
      await page.goto(`${origin}/${path}/`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.readyState === 'complete');
      assert.deepEqual(errors, [], `production scripts on /${path}/`);
      assert.equal(await page.$eval('#percent', el => /NaN|Infinity/.test(el.textContent)), false);
      if (path === 'articles/studio-regression') assert.equal(await page.$('.relatedPosts'), null);
    }
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 844 });
      await page.goto(`${origin}/wechat/`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => [...document.querySelectorAll('.wechatOA img')].every(img => img.complete && img.naturalWidth > 0));
      assert.equal(await page.$eval('.wechatOA-name', el => el.textContent), 'Studio WeChat');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'WeChat page must fit viewport');
      assert.deepEqual(errors, [], `WeChat viewport ${width}`);
      await page.screenshot({ path: join(screenshots, `theme-wechat-${width}.png`), fullPage: true });
    }
    console.log('PASS: generated site pages execute production scripts without errors; uncategorized posts, loaded WeChat images and desktop/mobile layouts.');
  } finally {
    await page?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
