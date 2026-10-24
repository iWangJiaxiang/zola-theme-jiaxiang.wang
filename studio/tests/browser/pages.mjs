import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'smol-toml';

export async function checkPageManagement({ page, base, screenshots, click, heading, fill, delayNextDocumentSave }) {
  const openPage = async path => {
    await click('页面'); await heading('页面');
    await page.waitForSelector(`.content-row[data-path="${path}"]`);
    assert.equal(await page.$$eval('.content-library .content-row', rows => rows.some(row => row.innerText.includes('_index.md'))), false);
    await page.click(`.content-row[data-path="${path}"]`);
    await page.waitForSelector('.page-editor-tabs');
    await click('页面设置');
  };
  const saveSettings = async () => { await click('保存页面设置'); await page.waitForSelector('.embedded-settings .notice.success'); };
  const config = async () => parse(await readFile(base + '/site/config.toml', 'utf8'));
  const data = async () => parse(await readFile(base + '/site/data.toml', 'utf8'));

  await openPage('content/pages/equipment.md');
  await page.waitForSelector('[name="extra.equipment.big_title"]');
  await fill('[name="extra.equipment.big_title"]', 'Studio gear banner');
  assert.equal(await page.$$eval('.settings-group-tabs button', buttons => buttons.find(button => button.textContent === '设备清单').disabled), true);
  await click('正文与属性');
  assert.equal(await page.$eval('button[name="template"]', select => select.disabled), true);
  await page.click('.page-editor-tabs button:last-child');
  assert.equal(await page.$eval('[name="extra.equipment.big_title"]', input => input.value), 'Studio gear banner');
  await saveSettings(); assert.equal((await config()).extra.equipment.big_title, 'Studio gear banner');
  await click('设备清单'); await page.waitForSelector('[name="equipment.groups.0.items.0.name"]');
  await fill('[name="equipment.groups.0.items.0.name"]', 'Studio laptop');
  await click('＋ 添加设备分组');
  await page.waitForSelector('[name="equipment.groups.2.name"]');
  assert.equal(await page.$('[name="equipment.groups.2.display_name"]'), null, 'equipment groups must use equipment schema');
  await fill('[name="equipment.groups.2.name"]', 'Extra devices');
  await saveSettings(); assert.equal((await data()).equipment.groups[0].items[0].name, 'Studio laptop');
  await page.screenshot({ path: screenshots + '/page-equipment-settings.png', fullPage: true });

  await openPage('content/pages/about.md');
  await page.waitForSelector('[name="extra.about.hello"]');
  await fill('[name="extra.about.hello"]', 'Hello from Studio'); await saveSettings();
  await click('技能清单'); await page.waitForSelector('[name="skill.items.0.name"]');
  await fill('[name="skill.items.0.name"]', 'Studio skill'); await saveSettings();
  assert.equal((await config()).extra.about.hello, 'Hello from Studio');
  assert.equal((await data()).skill.items[0].name, 'Studio skill');

  await openPage('content/pages/wechat.md');
  await page.waitForSelector('[name="extra.wechat.name"]');
  await fill('[name="extra.wechat.name"]', 'Studio WeChat'); await saveSettings();
  assert.equal((await config()).extra.wechat.name, 'Studio WeChat');

  await openPage('content/pages/music.md');
  await page.waitForSelector('[name="extra.tool.nav_music.id"]');
  assert.equal(await page.$('[name="extra.equipment.big_title"]'), null);
  await fill('[name="extra.tool.nav_music.id"]', '987654321'); await saveSettings();
  assert.equal((await config()).extra.tool.nav_music.id, '987654321');

  await openPage('content/pages/subscribe.md');
  await page.waitForSelector('[name="extra.subscribe.follow_url"]');
  await fill('[name="extra.subscribe.follow_url"]', '/studio-subscription/');
  await click('正文与属性');
  const subscriptionBody = await page.$eval('.markdown-source', textarea => textarea.value);
  await fill('.markdown-source', '# Subscription without shortcode'); await click('保存内容');
  await page.waitForFunction(() => document.querySelector('.editor-page > .notice.error')?.textContent.includes('先保存或放弃页面设置'));
  assert.ok((await readFile(base + '/site/content/pages/subscribe.md', 'utf8')).includes('subscribe_list'));
  await page.click('.page-editor-tabs button:last-child');
  assert.equal(await page.$eval('[name="extra.subscribe.follow_url"]', input => input.value), '/studio-subscription/');
  await saveSettings();
  await click('正文与属性');
  const releaseSave = delayNextDocumentSave();
  try {
    await click('保存内容');
    await page.waitForFunction(() => document.querySelector('.page-editor-tabs button:last-child')?.disabled);
    assert.equal(await page.$eval('.page-settings-pane', pane => pane.inert), true, 'settings must stay inert during a pending content save');
  } finally { releaseSave(); }
  await page.waitForSelector('.editor-page > .notice.success');
  await fill('.markdown-source', subscriptionBody); await click('保存内容');
  await page.waitForSelector('.editor-page > .notice.success');
  await page.click('.page-editor-tabs button:last-child');
  assert.equal((await config()).extra.subscribe.follow_url, '/studio-subscription/');

  await openPage('content/pages/archives.md');
  await page.waitForSelector('.embedded-settings .settings-grid');
  assert.ok(await page.$('[name="extra.sidebar.widgets.indexWidget.0.widget"]'));
  await openPage('content/pages/privacy.md');
  await page.waitForFunction(() => document.querySelector('.template-intro')?.innerText.includes('没有独立的模板配置'));
  assert.equal(await page.$('.embedded-settings'), null);

  await openPage('content/pages/friends.md');
  await page.waitForSelector('.embedded-settings .settings-grid');
  await click('静态友链清单'); await page.waitForSelector('.embedded-settings .settings-grid');
  await click('＋ 添加友链分组');
  await page.waitForSelector('[name="friend.groups.0.display_name"]');
  await fill('[name="friend.groups.0.display_name"]', 'Studio friends');
  await click('＋ 添加清单');
  await fill('[name="friend.groups.0.items.0.display_name"]', 'Example');
  await fill('[name="friend.groups.0.items.0.url"]', 'https://example.com');
  await fill('[name="friend.groups.0.items.0.logo"]', '/img/logo.webp');
  assert.equal(await page.$('[data-image-field="friend.groups.0.items.0.logo"] .image-field-preview'), null, 'TOML backup icons must not render previews');
  assert.equal(await page.$eval('[data-image-field="friend.groups.0.items.0.logo"] label', el => el.textContent), '备用图标地址');
  await saveSettings(); assert.equal((await data()).friend.groups[0].items[0].display_name, 'Example');

  await click('文章'); await heading('文章'); await page.waitForSelector('.content-row');
  assert.equal(await page.$$eval('.content-library .content-row', rows => rows.some(row => row.innerText.includes('_index.md') || row.dataset.path.endsWith('/_index.md'))), false);
  await click('专栏与合集'); await heading('专栏与合集');
  await page.waitForSelector('.content-row[data-path="content/collections/docs/_index.md"]');
  assert.equal(await page.$('.content-row[data-path="content/collections/_index.md"]'), null);
  await page.click('.content-row[data-path="content/collections/docs/_index.md"]');
  await page.waitForSelector('.content-row[data-path="content/collections/docs/user/_index.md"]');
  await page.click('.content-row[data-path="content/collections/docs/user/_index.md"]');
  await page.waitForSelector('.content-row[data-path="content/collections/docs/user/01 intro.md"]');
  await page.screenshot({ path: screenshots + '/collection-library.png', fullPage: true });
  await page.click('.content-row[data-path="content/collections/docs/user/01 intro.md"]');
  await page.waitForSelector('.markdown-source'); await click('← 返回内容库');
  await page.waitForSelector('.content-row[data-path="content/collections/docs/user/01 intro.md"]');
  await fill('[aria-label="搜索内容"]', 'Browser chapter');
  await page.waitForSelector('.content-row[data-path="content/collections/studio-column/studio-collection/chapter/index.md"]');
  assert.equal(await page.$$eval('.content-library .content-row', rows => rows.some(row => row.innerText.includes('_index.md'))), false);
  console.log('PASS: clean hierarchical libraries, template-specific config/data forms, separate saves, shared-config draft guards and settings persistence.');
}
