import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';

export async function checkLanguages({ browser, origin, screenshots, base }) {
  const fixture = base + '/site/content/articles/language-check';
  await mkdir(fixture, { recursive: true });
  await writeFile(fixture + '/index.md', '+++\ntitle="标签与分类"\ndate=2026-10-24\ndraft=false\n[taxonomies]\ntags=["project"]\ncategories=[]\n+++\nLanguage test content.');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR'] }));
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin + '/') || request.url().startsWith('data:') ? request.continue() : request.abort());
  const click = async text => {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === text && !button.disabled), {}, text);
    await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text && !button.disabled).click(), text);
  };
  const heading = text => page.waitForFunction(text => [...document.querySelectorAll('h1')].some(el => el.textContent === text), {}, text);
  const language = async locale => { await page.select('.language-switcher select', locale); await page.waitForFunction(locale => document.documentElement.lang === locale, {}, locale); };
  const fill = (selector, value) => page.$eval(selector, (el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  try {
    await page.goto(origin, { waitUntil: 'networkidle0' });
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', 'unsupported browser languages fall back to English');
    assert.equal(await page.evaluate(() => localStorage.getItem('studio-language')), 'en');
    await page.waitForSelector('[placeholder="Admin username"]');
    await page.screenshot({ path: screenshots + '/language-login-en.png' });
    await fill('[name=username]', 'owner'); await fill('[name=password]', 'incorrect-password-for-language-test'); await click('Sign in');
    await page.waitForSelector('.notice.error');
    assert.match(await page.$eval('.notice.error', el => el.textContent), /Incorrect username or password/);
    await language('zh-CN');
    assert.match(await page.$eval('.notice.error', el => el.textContent), /账号或密码错误/);
    await page.reload({ waitUntil: 'networkidle0' });
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'zh-CN', 'manual language survives reload');
    await language('en');
    await fill('[name=username]', 'owner'); await fill('[name=password]', 'studio-browser-test-2026'); await click('Sign in');
    await heading('What will you write today?');
    assert.equal(await page.evaluate(() => document.body.innerText.includes('非草稿')), false);
    await page.waitForFunction(() => [...document.querySelectorAll('.badge')].some(el => el.textContent === 'Published'));
    await page.screenshot({ path: screenshots + '/language-dashboard-en.png' });

    await click('Site information'); await heading('Site information');
    const originalTitle = await page.$eval('[name=title]', el => el.value);
    await fill('[name=title]', '标签与分类');
    await language('zh-CN'); await heading('站点信息');
    assert.equal(await page.$eval('[name=title]', el => el.value), '标签与分类');
    assert.equal(await page.$eval('.page-heading .primary', el => el.disabled), false);
    await language('en'); await heading('Site information');
    assert.equal(await page.$eval('[name=title]', el => el.value), '标签与分类', 'content must not be translated');
    await click('Discard changes and reload');
    await page.waitForFunction(original => document.querySelector('[name=title]')?.value === original, {}, originalTitle);

    for (const name of ['Navigation', 'Tags & categories', 'Featured content', 'About settings', 'Appearance', 'Friend links', 'Site information']) {
      await click(name); await heading(name);
      const untranslatedLabels = await page.$$eval('.settings-card .field > label, .settings-card .field > span, .settings-card label.field', nodes => nodes.map(el => el.textContent.trim()).filter(text => /[\u3400-\u9fff]/.test(text)));
      assert.deepEqual(untranslatedLabels, [], name + ' field labels must be localized');
      for (const width of [1440, 390, 320]) {
        await page.setViewport({ width, height: width === 1440 ? 1000 : 844 });
        if (width <= 760) await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' must fit at ' + width);
        if (name === 'Tags & categories' && width !== 320) await page.screenshot({ path: screenshots + '/language-tags-en-' + width + '.png' });
      }
      await page.setViewport({ width: 1440, height: 1000 });
    }

    await click('Posts'); await heading('Posts');
    await page.click('[data-field="status"] input[value="published"]');
    await page.waitForSelector('[data-path="content/articles/language-check/index.md"]'); await page.click('[data-path="content/articles/language-check/index.md"]');
    await page.waitForSelector('.markdown-source');
    assert.equal(await page.$eval('.page-heading h1', el => el.textContent), '标签与分类');
    await page.waitForFunction(() => document.querySelector('[aria-label="Selected Tags"] button')?.textContent.includes('项目'));
    assert.equal(await page.$eval('[aria-label="Selected Tags"] button', el => el.textContent.trim()), '项目 ×');
    const originalBody = await page.$eval('.markdown-source', el => el.value);
    await fill('.markdown-source', originalBody + '\nI18N unsaved source');
    await language('zh-CN'); await page.waitForSelector('.markdown-source');
    assert.equal(await page.$eval('.markdown-source', el => el.value), originalBody + '\nI18N unsaved source');
    await language('en');
    await click('Visual editor'); await page.waitForSelector('.vditor-ir [contenteditable=true]');
    await page.click('.vditor-ir [contenteditable=true]'); await page.keyboard.type('I18N-RICH-TAIL');
    await language('zh-CN'); await page.waitForSelector('.vditor-ir [contenteditable=true]');
    await click('Markdown 源码');
    assert.match(await page.$eval('.markdown-source', el => el.value), /I18N-RICH-TAIL/);
    assert.match(await page.$eval('.markdown-source', el => el.value), /I18N unsaved source/);
    await language('en');
    await click('Insert image'); await page.waitForSelector('dialog.media-dialog[open]');
    assert.match(await page.$eval('dialog.media-dialog[open] h2', el => el.textContent), /Choose or upload an image/);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
  } catch (error) { await page.screenshot({path: screenshots + '/language-failure.png', fullPage: true}); console.error((await page.evaluate(() => document.body.innerText)).slice(-1500)); throw error; } finally { await context.close(); await rm(fixture, {recursive:true,force:true}); }

  for (const storageBlocked of [false, true]) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.evaluateOnNewDocument(blocked => {
        Object.defineProperty(navigator, 'languages', { get: () => ['zh-HK', 'en-US'] });
        if (blocked) for (const name of ['getItem', 'setItem']) Object.defineProperty(Storage.prototype, name, { value() { throw new DOMException('Storage blocked', 'SecurityError'); } });
      }, storageBlocked);
      await page.goto(origin, { waitUntil: 'networkidle0' });
      assert.equal(await page.evaluate(() => document.documentElement.lang), 'zh-CN');
      await page.select('.language-switcher select', 'en');
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      if (!storageBlocked) {
        await page.reload({ waitUntil: 'networkidle0' });
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', 'saved English overrides Chinese browser preference');
      }
    } finally { await context.close(); }
  }
  console.log('PASS: language detection, English fallback, manual persistence, live notices, all settings labels, mobile English layouts and unsaved source/rich edits.');
}
