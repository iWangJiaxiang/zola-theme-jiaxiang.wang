import assert from 'node:assert/strict';

export async function checkLoading({ browser, origin, screenshots }) {
  const page = await browser.newPage();
  const pending = new Map();
  let holdInitial = true, failContent = false, failDocument = false;
  const requests = [];
  try {
    await page.evaluateOnNewDocument(() => localStorage.setItem('studio-language', 'zh-CN'));
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== origin) return request.abort();
      requests.push(url.pathname + url.search);
      if (holdInitial && ['/api/bootstrap', '/api/content'].includes(url.pathname)) { pending.set(url.pathname, request); return; }
      if ((failContent && url.pathname === '/api/content') || (failDocument && url.pathname === '/api/document')) {
        return request.respond({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: '请求失败，请稍后再试' }) });
      }
      return request.continue();
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.home-grid .loading-panel');
    assert.equal(pending.size, 2, 'bootstrap and content start in parallel');
    assert.deepEqual(await page.$$eval('.stat-card strong', nodes => nodes.map(node => node.textContent)), ['—', '—', '—']);
    assert.equal(await page.$('.home-grid .empty-state'), null, 'loading is not an empty library');
    await page.waitForFunction(() => document.body.innerText.includes('加载比平时久一些'), { timeout: 12_000 });
    await page.screenshot({ path: screenshots + '/loading-desktop.png', fullPage: true });
    await page.select('.language-switcher select', 'en');
    await page.waitForFunction(() => document.body.innerText.includes('This is taking longer than usual.'));
    await page.select('.language-switcher select', 'zh-CN');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.loading-spinner', node => getComputedStyle(node).animationName), 'none');
    await page.setViewport({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'loading fits mobile');
    await page.screenshot({ path: screenshots + '/loading-mobile.png', fullPage: true });
    await page.setViewport({ width: 1280, height: 900 });
    holdInitial = false;
    await pending.get('/api/bootstrap').continue();
    await pending.get('/api/content').respond({ status: 502, contentType: 'application/json', body: '{"error":"请求失败，请稍后再试"}' });
    pending.clear();
    await page.waitForSelector('.notice.error');
    assert.equal(await page.$('.home-grid .empty-state'), null, 'failure must not claim there is no content');
    await page.click('.notice.error button');
    await page.waitForFunction(() => Number(document.querySelector('.stat-card strong')?.textContent) > 0);
    assert.ok(requests.includes('/api/content?refresh=1'), 'workspace retry reloads the failed content request');
    assert.equal(await page.$('.notice.error'), null);
    failContent = true;
    await page.click('aside nav button:nth-child(2)');
    await page.waitForSelector('.content-library .notice.error');
    assert.equal(await page.$('.content-library .empty-state'), null, 'failed library request is not an empty state');
    failContent = false;
    await page.click('.content-library .notice.error button');
    await page.waitForSelector('.library-row .content-row');
    failDocument = true;
    await page.click('.library-row .content-row');
    await page.waitForSelector('main .notice.error');
    assert.equal(await page.$('.markdown-source'), null, 'failed document request must not expose an empty editable document');
    failDocument = false;
    await page.click('main .notice.error button');
    await page.waitForSelector('.markdown-source');
    console.log('PASS: parallel workspace reads, slow feedback, retry, document failure safety, reduced motion and mobile loading.');
  } finally {
    for (const request of pending.values()) await request.abort().catch(() => {});
    await page.close();
  }
}
