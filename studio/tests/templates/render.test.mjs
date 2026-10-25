import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchToml } from '../../server/content.ts';

const theme = fileURLToPath(new URL('../../../', import.meta.url));

// These integration tests require Zola and render the real theme in disposable sites.
async function site(t, values = {}) {
  const root = await mkdtemp(join(tmpdir(), 'studio-templates-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ['config.toml', 'data.toml', 'content']) {
    await cp(join(theme, name), join(root, name), { recursive: true });
  }
  await mkdir(join(root, 'themes'));
  await symlink(theme, join(root, 'themes/wondershine'), 'dir');
  const config = join(root, 'config.toml');
  const patch = async values => writeFile(config, patchToml(await readFile(config, 'utf8'), values));
  await patch({ theme: 'wondershine', minify_html: false, ...values });
  return {
    root, patch,
    build() {
      const result = spawnSync('zola', ['--root', root, 'build'], { encoding: 'utf8' });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    },
    // Tera escapes slashes in attributes; normalize those without unescaping text.
    html: async path => (await readFile(join(root, 'public', path, 'index.html'), 'utf8')).replaceAll('&#x2F;', '/'),
  };
}

test('published articles with empty categories build while categorized recommendations remain intact', async t => {
  const fixture = await site(t);
  const articles = {
    'empty-categories': '[taxonomies]\ntags=[]\ncategories=[]',
    'category-one': '[taxonomies]\ntags=[]\ncategories=["template-regression"]',
    'category-two': '[taxonomies]\ntags=[]\ncategories=["template-regression"]',
  };
  for (const [slug, taxonomy] of Object.entries(articles)) {
    const dir = join(fixture.root, 'content/articles', slug);
    await mkdir(dir, { recursive: true });
    // No draft field: existing published content must remain buildable.
    await writeFile(join(dir, 'index.md'), `+++\ntitle="${slug}"\ndate=2026-01-01\n${taxonomy}\n+++\nPublished regression body.\n`);
  }
  for (const mode of ['two', 'six']) {
    await fixture.patch({ 'extra.post.recommendQuantity': mode });
    fixture.build();
    const uncategorized = await fixture.html('articles/empty-categories');
    assert.match(uncategorized, /Published regression body\./);
    assert.doesNotMatch(uncategorized, /class="relatedPosts"/);
    const html = await fixture.html('articles/category-one');
    const related = html.match(/<div class="relatedPosts">[\s\S]*?<link[^>]+related-posts-[^>]+>/)?.[0];
    assert.ok(related, `related posts still render in ${mode} mode`);
    assert.match(related, /href="[^"]*\/articles\/category-two\/"/);
    assert.doesNotMatch(related, /href="[^"]*\/articles\/category-one\/"/);
    assert.match(related, new RegExp(`related-posts-${mode}\\.css`));
  }
});

test('published articles can omit categories or the whole taxonomies table', async t => {
  const fixture = await site(t);
  for (const [slug, taxonomy] of [['missing-categories', '[taxonomies]\ntags=[]'], ['missing-taxonomies', '']]) {
    const dir = join(fixture.root, 'content/articles', slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.md'), `+++\ntitle="${slug}"\ndate=2026-01-01\n${taxonomy}\n+++\nPublished regression body.\n`);
  }
  fixture.build();
  for (const slug of ['missing-categories', 'missing-taxonomies']) {
    const html = await fixture.html('articles/' + slug);
    assert.match(html, /Published regression body\./);
    assert.doesNotMatch(html, /class="relatedPosts"/);
  }
});

test('WeChat page renders every saved page setting and escapes text', async t => {
  const fixture = await site(t, {
    'extra.wechat.qrcode': '/img/wechat.svg',
    'extra.wechat.avatar': '/img/custom-avatar.webp',
    'extra.wechat.name': 'Studio WeChat & <name>',
    'extra.wechat.description': 'Studio description & <description>',
    'extra.wechat.tips': 'Studio scan & <tips>',
    'extra.wechat.help_text': 'Studio help & <help>',
    'extra.wechat.help_url': 'https://example.com/wechat-help',
  });
  fixture.build();
  const html = (await fixture.html('wechat')).match(/<div class="wechatOA"[\s\S]*?<\/a>/)?.[0] || '';
  assert.match(html, /class="wechatOA-name">Studio WeChat &amp; &lt;name&gt;<\/div>/);
  assert.match(html, /class="wechatOA-description">Studio description &amp; &lt;description&gt;<\/div>/);
  assert.match(html, /class="tips">Studio scan &amp; &lt;tips&gt;<\/div>/);
  assert.match(html, /class="qrcode progressive-picture">[\s\S]*?src="\/img\/wechat.svg"/);
  assert.match(html, /class="wechatOA-head"[^>]*\/img\/custom-avatar.webp/);
  assert.match(html, /href="https:\/\/example.com\/wechat-help"[^>]*>Studio help &amp; &lt;help&gt;<\/a>/);
});

test('WeChat legacy and partial configurations retain defaults and author/logo fallbacks', async t => {
  const fixture = await site(t, { author: 'Fallback author', 'extra.site.logo': '/img/fallback-logo.webp' });
  await mkdir(join(fixture.root, 'static/img'), { recursive: true });
  await cp(join(theme, 'static/img/logo.webp'), join(fixture.root, 'static/img/fallback-logo.webp'));
  for (const settings of [null, { 'extra.wechat.name': '', 'extra.wechat.avatar': '' }]) {
    if (settings) await fixture.patch(settings);
    fixture.build();
    const html = (await fixture.html('wechat')).match(/<div class="wechatOA"[\s\S]*?<\/a>/)?.[0] || '';
    assert.match(html, /class="wechatOA-name">Fallback author<\/div>/);
    assert.match(html, /class="wechatOA-head"[^>]*\/img\/fallback-logo.webp/);
    assert.match(html, /class="wechatOA-description">跨界 无极限<\/div>/);
    assert.match(html, /class="tips">扫描二维码关注公众号<\/div>/);
    const qr = html.match(/class="qrcode progressive-picture">[\s\S]*?src="([^"]+)"/)?.[1];
    assert.ok(qr?.includes('/processed_images/'), 'default QR code is processed by Zola');
    assert.ok((await readFile(join(fixture.root, 'public', new URL(qr, 'https://example.com').pathname))).length > 0);
    assert.match(html, /href="https:\/\/kf.qq.com\/touch\/wxappfaq\/1208117b2mai141113jaqAnU.html\?platform=14"[^>]*>不会扫码？<\/a>/);
  }
});

test('WeChat accepts remote QR images and avatar filenames containing quotes', async t => {
  const fixture = await site(t, {
    'extra.wechat.qrcode': 'https://example.invalid/qr.png?one=1&two=2',
    'extra.wechat.avatar': "/img/owner's.webp",
  });
  await mkdir(join(fixture.root, 'static/img'), { recursive: true });
  await cp(join(theme, 'static/img/logo.webp'), join(fixture.root, "static/img/owner's.webp"));
  fixture.build();
  const html = (await fixture.html('wechat')).match(/<div class="wechatOA"[\s\S]*?<\/a>/)?.[0] || '';
  assert.match(html, /<img class="qrcode" src="https:\/\/example.invalid\/qr.png\?one=1&amp;two=2"/);
  assert.match(html, /<img class="wechatOA-head" src="\/img\/owner&#x27;s.webp"/);
  assert.ok((await readFile(join(fixture.root, "public/img/owner's.webp"))).length > 0);
});

test('subscription cards render configured URLs with HTML escaping', async t => {
  const fixture = await site(t, {
    'extra.subscribe.wechat_url': '/custom-wechat/',
    'extra.subscribe.follow_url': 'https://example.com/follow?one=1&two=2',
    'extra.subscribe.rss_url': '/custom-feed.xml',
  });
  fixture.build();
  const html = (await fixture.html('subscribe')).match(/<div class="rss-plan-list">[\s\S]*?<style>/)?.[0] || '';
  assert.match(html, /class="rss-plan-item rss-plan-wechat" href="\/custom-wechat\/"/);
  assert.match(html, /class="rss-plan-item rss-plan-mail" href="https:\/\/example.com\/follow\?one=1&amp;two=2"/);
  assert.match(html, /class="rss-plan-item rss-plan-rss" href="\/custom-feed.xml"/);
});

test('subscription cards retain legacy defaults when settings are absent', async t => {
  const fixture = await site(t);
  fixture.build();
  const html = (await fixture.html('subscribe')).match(/<div class="rss-plan-list">[\s\S]*?<style>/)?.[0] || '';
  assert.match(html, /class="rss-plan-item rss-plan-wechat" href="\/wechat\/"/);
  assert.match(html, /class="rss-plan-item rss-plan-mail" href="https:\/\/app.follow.is\/share\/feeds\/89889813571729408"/);
  assert.match(html, /class="rss-plan-item rss-plan-rss" href="\/rss.xml"/);
});
