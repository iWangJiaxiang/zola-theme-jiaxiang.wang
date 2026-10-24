import assert from 'node:assert/strict';

// Exercise real radios/checkboxes and the dialog, without hidden native selects.
export function chooser(page) {
  return async (name, value) => {
    const root = `[data-field="${name}"]`;
    await page.waitForSelector(root);
    await page.waitForFunction(root => { const el = document.querySelector(root); return el && !el.querySelector('fieldset:disabled, button.choice-trigger:disabled'); }, {}, root);
    const trigger = await page.$(`${root} > .choice-trigger`);
    if (trigger) {
      await trigger.click();
      await page.waitForSelector('dialog[open]');
      await page.waitForSelector(`dialog[open] input[value="${value}"]`);
      await page.click(`dialog[open] input[value="${value}"]`);
      await page.click('dialog[open] .selection-footer button');
      await page.waitForFunction(() => !document.querySelector('dialog[open]'));
    } else {
      await page.waitForSelector(`${root} input[value="${value}"]`);
      await page.click(`${root} input[value="${value}"]`);
    }
  };
}

export async function checkControls({ page, click, heading, fill, base, screenshots, choose }) {
  const { readFile, writeFile, mkdir } = await import('node:fs/promises');
  const { patchToml, splitDocument } = await import('../../server/content.ts');
  const { parse } = await import('smol-toml');
  await click('外观样式'); await heading('外观样式');
  assert.equal(await page.$$eval('[data-field="extra.style.color_scheme"] input[type=radio]', nodes => nodes.length), 3);
  assert.equal(await page.$$eval('[data-field="extra.style.font_family"] input[type=radio]', nodes => nodes.length), 5, 'exactly five values remain flat');
  await choose('extra.style.color_scheme', 'light');
  await fill('[aria-label="选择浅色主题色"]', '#3355aa');
  assert.equal(await page.$eval('[name="extra.style.theme_light_skin"]', e => e.value), '#3355aa');
  assert.equal(await page.$eval('[data-field="extra.style.theme_light_skin"] .color-swatch', e => getComputedStyle(e).backgroundColor), 'rgb(51, 85, 170)');
  await click('保存更改'); await page.waitForSelector('.notice.success');
  assert.equal(parse(await readFile(base + '/site/config.toml', 'utf8')).extra.style.theme_light_skin, '#3355aa');
  await page.screenshot({ path: screenshots + '/form-colors.png', fullPage: true });
  await click('工作台'); await heading('今天，写点什么？');
  const configFile = base + '/site/config.toml';
  await writeFile(configFile, patchToml(await readFile(configFile, 'utf8'), { 'extra.style.font_family': 'Custom Font' }));
  await click('外观样式'); await heading('外观样式');
  await page.waitForSelector('button[name="extra.style.font_family"]');
  assert.equal(await page.$('[data-field="extra.style.font_family"] fieldset'), null, 'six values use a modal, including existing custom value');
  await page.click('button[name="extra.style.font_family"]'); await page.waitForSelector('dialog[open]');
  assert.equal(await page.$eval('dialog[open] .selection-results', el => el.querySelectorAll('input').length), 6);
  assert.equal(await page.$eval('dialog[open] input[value="Custom Font"]', el => el.checked), true, 'legacy values are retained');
  await page.click('dialog[open] input[value="system-ui"]');
  await click('取消');
  assert.ok(await page.$eval('button[name="extra.style.font_family"]', el => el.textContent.includes('Custom Font')));
  await choose('extra.style.font_family', 'PingFang SC');
  await click('保存更改'); await page.waitForSelector('.notice.success');

  await click('导航菜单'); await heading('导航菜单');
  const name = 'menu.nav_menu.0.menus.0.icon';
  await page.waitForSelector(`button[name="${name}"]`);
  await page.click(`button[name="${name}"]`); await page.waitForSelector('dialog[open]');
  await fill('dialog[open] input[type=search]', 'github');
  await page.click('dialog[open] input[value="icon-github"]');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  assert.equal(await page.evaluate(name => document.activeElement?.getAttribute('name') === name, name), true, 'Escape restores focus');
  assert.equal(await page.$eval('.settings-page .page-heading .primary', e => e.disabled), true, 'cancel must not change form');
  await choose(name, 'icon-github');
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.$eval(`[data-field="${name}"] .studio-glyph`, el => el.textContent.length > 0 && getComputedStyle(el).fontFamily.includes('studio-icons')));
  await click('保存更改'); await page.waitForSelector('.notice.success');
  assert.equal(parse(await readFile(base + '/site/data.toml', 'utf8')).menu.nav_menu[0].menus[0].icon, 'icon-github');

  await click('关于页设置'); await heading('关于页设置');
  const emojiField = 'extra.about.author_info_left_tags.0';
  await page.waitForSelector(`[name="${emojiField}"]`);
  const before = await page.$eval(`[name="${emojiField}"]`, el => el.value);
  await choose(emojiField + '-emoji', '🚀');
  assert.ok(await page.$eval(`[name="${emojiField}"]`, el => el.value.includes('🚀') && el.value.includes('数码科技爱好者')));
  await click('保存更改'); await page.waitForSelector('.notice.success');
  assert.notEqual(before, parse(await readFile(base + '/site/config.toml', 'utf8')).extra.about.author_info_left_tags[0]);

  await click('首页推荐'); await heading('首页推荐');
  const path = 'articles/misc/Lorem Ipsum/index.md';
  await choose('post.today_recommend.post_path', path);
  await click('保存更改'); await page.waitForSelector('.notice.success');
  assert.equal(parse(await readFile(base + '/site/data.toml', 'utf8')).post.today_recommend.post_path, path);

  // Creation form remains open when Enter is pressed in a nested chooser.
  await click('页面'); await heading('页面'); await click('新建页面');
  await fill('.modal input[placeholder="给它取个名字"]', 'Enter should not create');
  await fill('.modal input[placeholder="my-first-story"]', 'do-not-create');
  await page.click('button[name="page-template"]'); await page.waitForSelector('dialog[open]');
  await page.type('dialog[open] input[type=search]', '装备'); await page.keyboard.press('Enter');
  assert.ok(await page.$('.modal'), 'Enter inside dialog must not submit parent creation form');
  assert.ok(await page.$('dialog[open]'));
  await page.focus('dialog[open] input[value="page/equipment.html"]'); await page.keyboard.press('Enter');
  assert.ok(await page.$('.modal'), 'Enter on a radio must not submit the creation form');
  await page.setViewport({ width: 390, height: 844 });
  assert.ok(await page.$eval('dialog[open]', el => el.getBoundingClientRect().width <= innerWidth));
  await page.screenshot({ path: screenshots + '/form-picker-mobile.png', fullPage: true });
  await page.keyboard.press('Escape'); await click('取消');
  await page.setViewport({ width: 1440, height: 1000 });

  await mkdir(base + '/site/content/articles/date-control', { recursive: true });
  const dateFile = base + '/site/content/articles/date-control/index.md';
  await writeFile(dateFile, '+++\ntitle="Calendar control test"\ndate=2026-10-24T00:30:12.123456+08:00\nupdated=2026-10-25T10:20:30Z\n[taxonomies]\ntags=[]\ncategories=[]\n+++\nCalendar body.');
  await click('文章'); await heading('文章');
  await page.waitForSelector('.content-row[data-path="content/articles/date-control/index.md"]');
  await page.click('.content-row[data-path="content/articles/date-control/index.md"]');
  await page.waitForSelector('input[name="date"][type=date]');
  assert.equal(await page.$eval('input[name="date"]', el => el.value), '2026-10-24', 'must show original calendar day, not UTC previous day');
  await fill('input[name="date"]', '2026-10-26');
  await fill('input[name="updated"]', '');
  await click('保存内容'); await page.waitForSelector('.notice.success');
  const dateData = parse(splitDocument(await readFile(dateFile, 'utf8')).header);
  assert.equal(dateData.date, '2026-10-26T00:30:12.123456+08:00');
  assert.equal(Object.hasOwn(dateData, 'updated'), false, 'clearing updated removes the field, not an invalid empty datetime');
  await page.screenshot({ path: screenshots + '/form-date-editor.png', fullPage: true });
  await fill('input[name="date"]', ''); await click('保存内容');
  await page.waitForSelector('.editor-page > .notice.error');
  assert.match(await page.$eval('.editor-page > .notice.error', el => el.textContent), /需要发布时间/);
  assert.equal(parse(splitDocument(await readFile(dateFile, 'utf8')).header).date, '2026-10-26T00:30:12.123456+08:00');
  await click('← 返回内容库');


  await click('页面'); await heading('页面');
  await page.waitForSelector('.content-row[data-path="content/pages/about.md"]');
  await page.click('.content-row[data-path="content/pages/about.md"]'); await page.waitForSelector('.page-editor-tabs'); await click('页面设置');
  await click('技能清单'); await page.waitForSelector('[name="skill.items.0.name"]');
  await choose('skill.items.0.svg_symbol_id', 'python');
  await page.waitForFunction(() => document.querySelector('[data-field="skill.items.0.svg_symbol_id"] use')?.getAttribute('href')?.endsWith('#python'));
  await click('保存页面设置'); await page.waitForSelector('.embedded-settings .notice.success');
  const skills = parse(await readFile(base + '/site/data.toml', 'utf8')).skill;
  assert.equal(skills.items[0].svg_symbol_id, 'python');
  assert.equal(Object.hasOwn(skills.items[0], 'svg_sprite'), false, 'inherited sprite must stay absent');
  await click('赞赏名单'); await page.waitForSelector('[name="extra.about_reward.reward.name"]');
  await click('＋ 添加赞赏者');
  await page.waitForSelector('[name="extra.about_reward.sponsors.2.date"]');
  assert.match(await page.$eval('[name="extra.about_reward.sponsors.2.date"]', el => el.value), /^\d{4}-\d{2}-\d{2}$/);
  await click('放弃更改并重新加载');

  console.log('PASS: flat choices, color previews, icon font, emoji text preservation, file references and nested modal keyboard behavior.');
}
