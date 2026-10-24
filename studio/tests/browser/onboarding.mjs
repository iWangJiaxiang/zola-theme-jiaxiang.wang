import assert from 'node:assert/strict';

export async function checkOnboarding({ page, click, heading, screenshots }) {
  await page.waitForSelector('.getting-started:not(.guide-page)');
  assert.match(await page.$eval('.getting-started', el => el.innerText), /保存会直接修改站点文件/);
  await page.select('.language-switcher select', 'en');
  await page.waitForFunction(() => document.querySelector('#guide-title')?.textContent === 'Start here');
  const copy = await page.$eval('.getting-started', el => el.innerText);
  assert.equal(/[\u3400-\u9fff]/.test(copy), false, 'onboarding copy must be fully translated');
  for (const width of [1440, 390, 320]) {
    await page.setViewport({ width, height: width === 1440 ? 1000 : 844 });
    if (width < 760) await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'onboarding fits at ' + width);
  }
  await page.screenshot({ path: screenshots + '/onboarding-mobile-en.png', fullPage: true });
  await click('Dismiss guide');
  assert.equal(await page.$('.getting-started'), null);
  await page.reload({ waitUntil: 'networkidle0' });
  await heading('What will you write today?');
  await page.waitForSelector('.welcome-card');
  assert.equal(await page.$('.getting-started'), null, 'dismissal survives reload');
  await page.setViewport({ width: 1440, height: 1000 });
  await click('User guide'); await heading('User guide');
  assert.ok(await page.$('.guide-page'), 'dismissed guide can be reopened');
  await page.$eval('.guide-step', el => el.click());
  await heading('Site information');
  await page.select('.language-switcher select', 'zh-CN');
  await click('工作台'); await heading('今天，写点什么？');
  assert.equal(await page.$('.getting-started'), null);
  await click('使用指南'); await heading('使用指南');
  await page.screenshot({ path: screenshots + '/onboarding-guide-zh.png', fullPage: true });
  await click('工作台'); await heading('今天，写点什么？');
  console.log('PASS: bilingual first-use guide, mobile layout, dismissal persistence, reopening and direct settings navigation.');
}
