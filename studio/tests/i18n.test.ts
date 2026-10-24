import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLocale, resolveLocale, translate } from '../shared/i18n.js';
import { english, chinese } from '../shared/messages.js';

test('locale selection uses a saved choice, then browser preference, then English', () => {
  assert.equal(initialLocale('en', ['zh-CN']), 'en');
  assert.equal(initialLocale('zh-CN', ['en-US']), 'zh-CN');
  assert.equal(initialLocale(null, ['zh-TW', 'en-US']), 'zh-CN');
  assert.equal(initialLocale(null, ['en-GB', 'zh-CN']), 'en');
  assert.equal(initialLocale(null, ['fr-FR', 'zh-HK']), 'zh-CN');
  assert.equal(initialLocale('invalid', ['fr-FR']), 'en');
  assert.equal(resolveLocale([]), 'en');
});

test('messages interpolate values without translating content or inherited property names', () => {
  assert.equal(translate('已发布', 'en'), 'Published');
  assert.equal(translate('已发布', 'zh-CN'), '已发布');
  assert.equal(translate('欢迎回来，{name}。开始记录新的想法吧。', 'en', { name: '文章' }), 'Welcome back, 文章. Start with a new idea.');
  assert.equal(translate({ key: '字段“{path}”的格式不正确', params: { path: 'extra.custom' } }, 'en'), 'The format of “extra.custom” is invalid.');
  assert.equal(translate('toString', 'en'), 'toString');
  assert.equal(translate('constructor', 'zh-CN'), 'constructor');
  assert.equal(translate('my_custom_field', 'en'), 'my_custom_field');
});

test('all catalog translations preserve interpolation parameters', () => {
  const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [key, value] of Object.entries({ ...english, ...chinese })) {
    assert.deepEqual(params(value), params(key), key);
    assert.ok(value.trim(), key);
  }
});

test('all registered settings and page templates have English UI copy', async () => {
  const { settingsSchemas, documentFields, fieldLabels } = await import('../shared/settings.js');
  const { pageSettingsSchemas, pageTemplateChoices, pageProfile } = await import('../shared/page-settings.js');
  const check = (message?: string) => { if (message && /[\u3400-\u9fff]/.test(message)) assert.ok(Object.hasOwn(english, message), `Missing English copy: ${message}`); };
  for (const schema of [...settingsSchemas, ...pageSettingsSchemas]) {
    check(schema.title); check(schema.description);
    for (const field of schema.fields) { check(field.label); check(field.hint); }
  }
  for (const field of documentFields) { check(field.label); check(field.hint); }
  for (const label of Object.values(fieldLabels)) check(label);
  for (const option of pageTemplateChoices) {
    check(option.label);
    const profile = pageProfile(option.value, '{{ subscribe_list() }}');
    check(profile.description);
    for (const group of profile.groups) check(group.label);
  }
  check(pageProfile('custom.html').description);
});
