import puppeteer from 'puppeteer-core';
import { checkLoading } from './loading.mjs';
import { checkLanguages } from './languages.mjs';
import { checkOnboarding } from './onboarding.mjs';
import { checkMedia } from './media.mjs';
import { checkUploads } from './uploads.mjs';
import { chooser, checkControls } from './controls.mjs';
import { checkPageManagement } from './pages.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { patchToml, splitDocument } from '../../server/content.ts';
import { parse } from 'smol-toml';
import { hashPassword } from '../../server/password.ts';
const studio = fileURLToPath(new URL('../../', import.meta.url));
const theme = fileURLToPath(new URL('../../../', import.meta.url));
const base = await mkdtemp(join(tmpdir(), 'studio-browser-'));
const screenshots = join(studio, 'test-results');
await mkdir(screenshots, { recursive: true });
await mkdir(base + '/site/static/data', { recursive: true });
for (const name of ['config.toml', 'data.toml', 'content']) await cp(join(theme, name), join(base, 'site', name), { recursive: true });
await cp(join(theme, 'static/data/friends.json'), base + '/site/static/data/friends.json');
await mkdir(base + '/site/themes', { recursive: true });
await symlink(theme, base + '/site/themes/wondershine', 'dir');
await writeFile(base + '/site/config.toml', patchToml(await readFile(base + '/site/config.toml', 'utf8'), { theme: 'wondershine' }));
const reserve = createServer();
await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, ['dist/server.mjs'], { cwd: studio, env: { ...process.env,
  STUDIO_ORIGIN: origin, PORT: String(port), STUDIO_HOST: '127.0.0.1', STUDIO_SITE_ROOT: base + '/site',
  STUDIO_STATE: 'file', STUDIO_STATE_DIR: base + '/state', STUDIO_GIT_URL: '', STUDIO_OIDC_ISSUER: '',
  STUDIO_ADMIN_USER: 'owner', STUDIO_ADMIN_PASSWORD_HASH: await hashPassword('studio-browser-test-2026'), STUDIO_SESSION_SECRET: randomBytes(32).toString('hex') }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; server.stderr.on('data', data => { logs += data; });
const executablePath = process.env.STUDIO_TEST_BROWSER || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
let browser;
try {
  if (!executablePath) throw new Error('Set STUDIO_TEST_BROWSER to an installed Chrome/Chromium executable.');
  for (let i = 0; i < 100; i++) { try { if ((await fetch(origin + '/api/auth/config')).ok) break; } catch {} if (i === 99) throw new Error('Server did not start: ' + logs); await new Promise(r => setTimeout(r, 100)); }
  browser = await puppeteer.launch({ headless: true, executablePath });
  const page = await browser.newPage(), errors = [], failures = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  let holdDocumentWrite = false, releaseDocumentWrite;
  const delayNextDocumentSave = () => { holdDocumentWrite = true; return () => { holdDocumentWrite = false; releaseDocumentWrite?.(); releaseDocumentWrite = undefined; }; };
  page.on('request', request => {
    if (holdDocumentWrite && request.url() === origin + '/api/document' && request.method() === 'PUT') { releaseDocumentWrite = () => request.continue(); return; }
    return request.url().startsWith(origin + '/') || request.url().startsWith('data:') ? request.continue() : request.abort();
  });
  const click = async text => { await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.innerText.trim() === text && !button.disabled), {}, text); const found = await page.evaluate(text => { const button = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === text); if (!button) return false; button.click(); return true; }, text); assert.ok(found, `button: ${text}`); };
  const choose = chooser(page);
  const heading = text => page.waitForFunction(text => [...document.querySelectorAll('h1')].some(e => e.textContent === text), {}, text);
  const fill = (selector, text) => page.$eval(selector, (el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, text);
  const waitText = text => page.waitForFunction(text => document.body.innerText.includes(text), {}, text);
 await checkLanguages({ browser, origin, screenshots, base });
 await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN'] }));
 await page.goto(origin,{waitUntil:'networkidle0'});
 await page.screenshot({path:screenshots+'/login-desktop.png'});
 await page.type('[name=username]','owner');await page.type('[name=password]','studio-browser-test-2026');await click('进入创作中心');await heading('今天，写点什么？');
 await checkLoading({ browser, origin, screenshots });
 await checkOnboarding({ page, click, heading, screenshots });
 await page.waitForFunction(()=>Number(document.querySelector('.stat-card strong')?.textContent)>0);
 await page.screenshot({path:screenshots+'/dashboard-desktop.png'});
 await click('站点信息');await heading('站点信息');await fill('.settings-grid .field input','Studio integration fixture');await click('保存更改');await page.waitForSelector('.notice.success');
 assert.match(await readFile(base+'/site/config.toml','utf8'),/Studio integration fixture/);
 for(const name of ['导航菜单','友链管理','关于页设置','标签与分类','外观样式']){await click(name);await heading(name);assert.equal(await page.$('.notice.error'),null,name)}
 await click('文章');await heading('文章');await click('新建文章');await fill('.modal input[placeholder="给它取个名字"]','Browser test story');await fill('.modal input[placeholder="my-first-story"]','studio-browser-test');await click('进入编辑器');await heading('Browser test story');
 await choose('taxonomies.tags', 'tech');
 await choose('taxonomies.categories', 'misc');
 assert.equal(await page.$('[data-field="template"] input[value=""]'), null, 'empty template must not be selectable');
 assert.equal(await page.$$eval('[aria-label="已选标签"] button', options => options.length), 1, 'selected terms cannot be duplicated');
 await page.click('[aria-label="移除标签：技术"]');
 await choose('taxonomies.tags', 'tech');
 assert.equal(await page.$('.metadata-card .structured-item input'), null, 'taxonomies must not use free text');
 await fill('.markdown-source','# A new story\n\nThis is a browser integration test.\n');
 await page.$eval('.metadata-card input[type=checkbox]',el=>el.click());
 await click('保存内容');await page.waitForSelector('.notice.success');
 let source=await readFile(base+'/site/content/articles/studio-browser-test/index.md','utf8');assert.match(source,/draft = false/);assert.match(source,/# A new story/);
 assert.deepEqual({ ...parse(splitDocument(source).header).taxonomies }, { tags: ['tech'], categories: ['misc'] });
 await click('正文预览');await page.waitForSelector('.markdown-preview h1');
 await click('可视化编辑');await page.waitForSelector('.vditor-ir [contenteditable=true]',{timeout:15000});
 await page.screenshot({path:screenshots+'/editor-desktop.png'});
 await click('Markdown 源码');
 await writeFile(base+'/site/content/articles/studio-browser-test/index.md',source.replace('Browser test story','Changed externally'));
 await fill('.title-field input','My local edit');await click('保存内容');await page.waitForSelector('.notice.error');assert.match(await page.$eval('.notice.error',e=>e.textContent),/文件已更新/);
 assert.match(await readFile(base+'/site/content/articles/studio-browser-test/index.md','utf8'),/Changed externally/);
 await click('工作台');await heading('今天，写点什么？');
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);await page.screenshot({path:screenshots+'/dashboard-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 await page.click('[aria-label="打开导航"]');await click('友链管理');await heading('友链管理');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile settings overflow');
 await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 0);await page.screenshot({path:screenshots+'/friends-mobile.png',fullPage:true});

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await click('专栏与合集'); await heading('专栏与合集');
  for (const item of [{ type: 'column', title: 'Browser column', slug: 'studio-column', parent: '' }, { type: 'collection', title: 'Browser collection', slug: 'studio-collection', parent: 'studio-column' }, { type: 'chapter', title: 'Browser chapter', slug: 'chapter', parent: 'studio-column/studio-collection' }]) {
    await click('新建内容'); await choose('content-type', item.type);
    await fill('.modal input[placeholder="给它取个名字"]', item.title); await fill('.modal input[placeholder="my-first-story"]', item.slug);
    if (item.parent) await choose('collection-parent', item.parent);
    await click('进入编辑器'); await heading(item.title);
    await fill('.markdown-source', '# ' + item.title + '\n\nBrowser test content.\n');
    await page.$eval('.metadata-card input[type=checkbox]', el => el.click());
    await click('保存内容'); await page.waitForSelector('.notice.success');
    await click('← 返回内容库'); await heading('专栏与合集');
  }

  // The article flow can select an existing collection without typing a directory.
  await click('文章'); await heading('文章'); await click('新建文章');
  await fill('.modal input[placeholder="给它取个名字"]', 'Selected collection story');
  await fill('.modal input[placeholder="my-first-story"]', 'selected-story');
  await choose('article-collection', 'studio-column/studio-collection');
  await click('进入编辑器'); await heading('Selected collection story');
  await click('保存内容'); await page.waitForSelector('.notice.success');
  assert.ok((await readFile(base + '/site/content/collections/studio-column/studio-collection/selected-story/index.md', 'utf8')).includes('page/collection-content.html'));

  await click('页面'); await heading('页面'); await click('新建页面');
  await fill('.modal input[placeholder="给它取个名字"]', 'Browser page'); await fill('.modal input[placeholder="my-first-story"]', 'studio-page');
  await click('进入编辑器'); await heading('Browser page'); await fill('.markdown-source', '# Browser page');
  await page.$eval('.metadata-card input[type=checkbox]', el => el.click()); await click('保存内容'); await page.waitForSelector('.notice.success');
  await checkPageManagement({ page, base, screenshots, click, heading, fill, delayNextDocumentSave });
  await checkControls({ page, click, heading, fill, base, screenshots, choose });
  await checkMedia({ page, base, theme, screenshots, click, heading, fill });
  await checkUploads({ page, base, theme, screenshots, click, heading, fill });
  await page.click('[aria-label="退出登录"]');await page.waitForSelector('[name=username]');
 assert.equal(await page.evaluate(async()=> (await fetch('/api/content')).status),401);
 assert.deepEqual(errors,[]);
 console.log('PASS: production browser login, dashboard, settings persistence, all forms, new article, preview, Vditor local assets, stale-save rejection, mobile layout, logout.');

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const path = 'content/articles/studio-regression/index.md';
  await mkdir(base + '/site/content/articles/studio-regression', { recursive: true });
  await writeFile(base + '/site/' + path, '+++\ntitle="Regression story"\ndate=2026-10-24\n[taxonomies]\ntags=[]\ncategories=[]\n+++\nOriginal body\n');
 await page.goto(origin,{waitUntil:'networkidle0'});await page.type('[name=username]','owner');await page.type('[name=password]','studio-browser-test-2026');await click('进入创作中心');await waitText('今天，写点什么？');
 const stored=await page.evaluate(async path=>{const d=await(await fetch('/api/document?path='+encodeURIComponent(path))).json();localStorage.setItem('studio-draft:password:owner:'+path,JSON.stringify({body:'Recovered writing\n',values:{title:'Regression story',draft:false},baseline:{title:'Regression story',draft:false},originalBody:d.body,revision:d.revision}));return d},path);
 await click('文章');await waitText('Regression story');await page.evaluate(()=>[...document.querySelectorAll('.content-row')].find(b=>b.innerText.includes('Regression story')).click());await page.waitForSelector('.markdown-source');
 if(await page.$eval('.metadata-card input[type=checkbox]',e=>e.checked))failures.push('existing document without draft incorrectly marked draft');
 await click('可视化编辑');await page.waitForSelector('.vditor-ir [contenteditable=true]');await click('恢复草稿');
 if(await page.$('.markdown-source')){assert.match(await page.$eval('.markdown-source',e=>e.value),/Recovered writing/);await click('可视化编辑');await page.waitForSelector('.vditor-ir [contenteditable=true]')}
 else if(!await page.$eval('.vditor-ir [contenteditable=true]',e=>e.textContent.includes('Recovered writing')))failures.push('recovery did not update visible rich editor');
 await page.click('.vditor-ir [contenteditable=true]');await page.keyboard.press('End');await page.keyboard.type('FAST-INPUT-TAIL');await click('保存内容');await page.waitForSelector('.notice.success');
 if(!(await readFile(base+'/site/'+path,'utf8')).includes('FAST-INPUT-TAIL'))failures.push('immediate save lost rich input');
 await page.click('.vditor-ir [contenteditable=true]');await page.keyboard.type('MODE-SWITCH-TAIL');await click('Markdown 源码');
 if(!await page.$eval('.markdown-source',e=>e.value.includes('MODE-SWITCH-TAIL')))failures.push('mode switch lost rich input');
 await page.$eval('.markdown-source',e=>{e.value+='SOURCE-AFTER-SWITCH';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await new Promise(r=>setTimeout(r,1000));if(!await page.$eval('.markdown-source',e=>e.value.includes('SOURCE-AFTER-SWITCH')))failures.push('old rich callback replaced new source');
 await click('站点信息');await page.waitForSelector('.settings-grid');await page.$eval('.settings-grid input',e=>{e.value='Unsaved through reauthentication';e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.evaluate(async()=>{const s=await(await fetch('/api/auth/session')).json();await fetch('/api/auth/logout',{method:'POST',headers:{'x-csrf-token':s.csrf}})});await click('保存更改');await page.waitForSelector('[name=username]');
 await page.type('[name=username]','owner');await page.type('[name=password]','studio-browser-test-2026');await click('进入创作中心');await page.waitForFunction(()=>!document.querySelector('[name=username]'));
 if(!await page.$('.settings-grid input'))failures.push('expired session discarded settings form');
 else if(await page.$eval('.settings-grid input',e=>e.value)!=='Unsaved through reauthentication')failures.push('reauthentication lost configuration changes');
 assert.deepEqual(failures,[]);console.log('PASS: draft defaults, recovery, immediate rich save/switch, stale callback, reauthentication preservation.');

  // Session storage survives a full navigation (including an OIDC round trip).
  await page.reload({ waitUntil: 'networkidle0' }); await waitText('今天，写点什么？');
  await click('站点信息'); await page.waitForSelector('.settings-grid input');
  assert.equal(await page.$eval('.settings-grid input', e => e.value), 'Unsaved through reauthentication');
  assert.deepEqual(errors, []);
  const zola = spawnSync('zola', ['--root', base + '/site', 'build'], { encoding: 'utf8' });
  if (zola.error?.code === 'ENOENT') console.log('SKIP: Zola build (zola executable is not installed).');
  else {
    assert.equal(zola.status, 0, zola.stdout + zola.stderr);
    const html = async path => readFile(base + '/site/public/' + path + '/index.html', 'utf8');
    const articleHTML = await html('articles/studio-browser-test');
    const insertedSource = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').querySelector('img[alt="媒体 配图.webp"]')?.getAttribute('src'), articleHTML);
    assert.equal(decodeURI(insertedSource || ''), '/img/媒体 配图.webp');
    assert.ok((await readFile(base + '/site/public/img/媒体 配图.webp')).length > 0);
    assert.deepEqual(await readFile(base + '/site/public/uploads/上传 配图.webp'), await readFile(base + '/site/static/uploads/上传 配图.webp'));
    assert.deepEqual(await readFile(base + '/site/public/articles/studio-browser-test/cover-upload.png'), await readFile(base + '/site/content/articles/studio-browser-test/cover-upload.png'));
    assert.ok((await readFile(base + '/site/public/articles/studio-browser-test/封面 配图.webp')).length > 0);
    assert.match(await html('equipment'), /Studio gear banner/);
    assert.match(await html('equipment'), /Studio laptop/);
    assert.match(await html('about'), /Studio skill/);
    assert.match(await html('wechat'), /Studio WeChat/);
    assert.match(await html('subscribe'), /studio-subscription/);
    // Verify the optional TOML friend source is also buildable.
    const currentConfig = await readFile(base + '/site/config.toml', 'utf8');
    await writeFile(base + '/site/config.toml', patchToml(currentConfig, { 'extra.friend.dynamic_render': false }));
    const staticFriends = spawnSync('zola', ['--root', base + '/site', 'build'], { encoding: 'utf8' });
    assert.equal(staticFriends.status, 0, staticFriends.stdout + staticFriends.stderr);
    assert.match(await html('friends'), /Studio friends/);
    console.log('PASS: Zola builds content and renders page configuration, including static TOML friends.');
  }
  console.log('PASS: configuration recovery after full reload; screenshots in studio/test-results.');
} catch (error) {
  if (browser) { const pages = await browser.pages(); const last = pages.at(-1); if (last) { await last.screenshot({ path: screenshots + '/failure.png', fullPage: true }); console.error((await last.evaluate(() => document.body.innerText)).slice(-2500)); } }
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  await rm(base, { recursive: true, force: true });
}
