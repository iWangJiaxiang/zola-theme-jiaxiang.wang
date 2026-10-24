<script setup lang="ts">
import { t, locale, translateOptions, type Message } from '../i18n';
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type Vditor from 'vditor';
import type { Article, ArticleSummary, Json, SaveResult, Settings } from '../../shared/types';
import { documentFields } from '../../shared/settings';
import { taxonomyChoices, stringValues, type Choice } from '../../shared/choices';
import { api, session, errorMessage } from '../api';
import ChoiceSelect from './ChoiceSelect.vue';
import SelectionField from './SelectionField.vue';
import FormField from './FormField.vue';
import { localDate } from '../../shared/form-fields';
import PageSettings from './PageSettings.vue';
import MediaPicker from './MediaPicker.vue';
import { markdownImage, mediaURL, storedMediaPath, type MediaItem } from '../../shared/media';
import { pageTemplateChoices, pageProfile } from '../../shared/page-settings';
const props = defineProps<{ path: string; initial?: Record<string, Json> }>();
const emit = defineEmits<{ dirty: [value: boolean]; back: [] }>();
const body = ref(''), values = ref<Record<string, Json>>({}), baseline = ref<Record<string, Json>>({}), originalBody = ref('');
const revision = ref<string | null>(null), loading = ref(true), busy = ref(false), error = ref<Message>(''), message = ref<Message>('');
const mode = ref<'source' | 'rich' | 'preview'>('source'), editorElement = ref<HTMLDivElement>(), recovery = ref(false), ready = ref(false);
const imagePicker = ref(false), sourceElement = ref<HTMLTextAreaElement>();
let imageCursor = { start: 0, end: 0 };
function chooseImage() {
  flush(); imageCursor = { start: sourceElement.value?.selectionStart ?? body.value.length, end: sourceElement.value?.selectionEnd ?? body.value.length }; imagePicker.value = true;
}
async function insertImage(item: MediaItem, value: string) {
  const snippet = '\n' + markdownImage(item, value) + '\n';
  body.value = body.value.slice(0, imageCursor.start) + snippet + body.value.slice(imageCursor.end);
  imagePicker.value = false; await nextTick();
  sourceElement.value?.focus(); sourceElement.value?.setSelectionRange(imageCursor.start + snippet.length, imageCursor.start + snippet.length);
}
const choices = ref<Record<string, Choice[]>>({}), choicesLoading = ref(true), choicesError = ref<Message>('');
const isCollection = props.path.startsWith('content/collections/');
const isSection = props.path.endsWith('/_index.md');
const isPage = props.path.startsWith('content/pages/') && !isSection;
const pageTab = ref<'content' | 'settings'>('content'), settingsOpened = ref(false), settingsDirty = ref(false);
const savedTemplate = computed(() => String(baseline.value.template || 'page/empty.html'));
const templateChanged = computed(() => !!revision.value && String(values.value.template || 'page/empty.html') !== savedTemplate.value);
function showPageSettings() { if (busy.value) return; flush(); pageTab.value = 'settings'; settingsOpened.value = true; }
const visibleFields = computed(() => documentFields.filter(field => !['title', 'description', 'draft'].includes(field.path)
  && (!isPage || ['path', 'template', 'extra.disable_comment'].includes(field.path))
  && (isCollection || field.path !== 'extra.tags') && (isSection || !['page_template', 'render', 'insert_anchor_links'].includes(field.path))));
const fixedChoices: Record<string, Choice[]> = {
  template: ['post', 'empty', 'about', 'friends', 'music', 'equipment', 'wechat', 'archives', 'collection-list', 'collection-detail', 'collection-content', 'collection-category'].map((name, index) => ({ value: `page/${name}.html`, label: ['文章', '普通页面', '关于', '友链', '音乐', '装备', '微信', '归档', '专栏列表', '合集详情', '合集章节', '合集分类'][index] })),
  page_template: [{ value: 'page/collection-content.html', label: '合集章节' }, { value: 'page/post.html', label: '文章' }, { value: 'page/empty.html', label: '普通页面' }],
  insert_anchor_links: [{ value: 'none', label: '不显示' }, { value: 'left', label: '标题左侧' }, { value: 'right', label: '标题右侧' }, { value: 'heading', label: '整个标题' }],
};
function selectOptions(path: string): Choice[] {
  const options = isPage && path === 'template' ? pageTemplateChoices : fixedChoices[path] || [], value = String(values.value[path] ?? '');
  return translateOptions(options.filter(option => option.value !== ''));
}
async function loadChoices() {
  choicesLoading.value = true; choicesError.value = '';
  try {
    const [settings, items] = await Promise.all([api<Settings>('/settings/taxonomies'), api<ArticleSummary[]>('/content')]);
    const tags = taxonomyChoices(settings.values['post.tags'], items.flatMap(item => item.tags));
    choices.value = {
      'taxonomies.tags': tags,
      'taxonomies.categories': taxonomyChoices(settings.values['post.categories'], items.flatMap(item => item.categories)),
      // Display tags are literal labels in collection templates, unlike taxonomy IDs.
      'extra.tags': taxonomyChoices(undefined, [...tags.map(tag => tag.label), ...items.flatMap(item => stringValues(item.displayTags))]),
    };
  } catch (e) { choicesError.value = errorMessage(e); }
  finally { choicesLoading.value = false; }
}
let editor: Vditor | undefined, alive = true, generation = 0, richReady = false;
const storageKey = `studio-draft:${session.value?.identity.method}:${session.value?.identity.id}:${props.path}`;
const shortcode = computed(() => /\{%|\{\{/.test(body.value));
const changes = computed(() => Object.fromEntries(Object.entries(values.value).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(baseline.value[key]))));
const dirty = computed(() => body.value !== originalBody.value || Object.keys(changes.value).length > 0);
const preview = computed(() => {
  const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(marked.parse(body.value, { async: false }) as string), 'text/html');
  for (const image of parsed.querySelectorAll('img')) {
    try { const path = storedMediaPath(decodeURIComponent(image.getAttribute('src') || ''), 'document', props.path); if (path) image.setAttribute('src', mediaURL(path)); } catch { /* Preserve unrecognized URLs. */ }
  }
  return parsed.body.innerHTML;
});
const wordCount = computed(() => body.value.replace(/\s/g, '').length);
const get = (data: Record<string, Json>, path: string): Json | undefined => path.split('.').reduce<any>((value, key) => value && typeof value === 'object' ? value[key] : undefined, data);
function snapshot() { return JSON.stringify({ body: body.value, values: values.value, revision: revision.value, baseline: baseline.value, originalBody: originalBody.value }); }
watch([dirty, settingsDirty], ([documentDirty, configurationDirty]) => emit('dirty', documentDirty || configurationDirty), { flush: 'sync' });
watch([body, values], () => { if (!ready.value || !dirty.value) return; try { localStorage.setItem(storageKey, snapshot()); } catch { message.value = '浏览器草稿备份不可用，请及时保存或下载。'; } }, { deep: true });
onMounted(async () => {
  void loadChoices();
  try {
    if (props.initial) {
      baseline.value = Object.fromEntries(documentFields.filter(field => field.path !== 'date').map(field => [field.path, structuredClone(field.default)]));
      values.value = { ...JSON.parse(JSON.stringify(baseline.value)), ...(!isSection ? { date: localDate() } : {}), ...props.initial };
    }
    else {
      const doc = await api<Article>(`/document?path=${encodeURIComponent(props.path)}`);
      body.value = doc.body; originalBody.value = doc.body; revision.value = doc.revision;
      values.value = Object.fromEntries(documentFields.map(field => [field.path, get(doc.metadata, field.path) ?? (field.path === 'draft' ? false : field.default)]));
      baseline.value = JSON.parse(JSON.stringify(values.value));
    }
    try { recovery.value = !!localStorage.getItem(storageKey); } catch { /* Storage can be disabled. */ }
  } catch (e) { error.value = errorMessage(e); }
  finally { loading.value = false; await nextTick(); ready.value = true; }
});
function restore() {
  if (settingsDirty.value) { error.value = '页面设置还有未保存的更改，请先保存或放弃这些设置，再恢复正文草稿'; return; }
  try {
    const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!draft || typeof draft.body !== 'string' || !draft.values) throw new Error('本地草稿格式不正确');
    destroyEditor(false); mode.value = 'source';
    body.value = draft.body; values.value = draft.values;
    // Preserve the saved revision: stale recovered drafts must conflict, never overwrite a newer file.
    revision.value = draft.revision; baseline.value = draft.baseline; originalBody.value = draft.originalBody;
    recovery.value = false; message.value = '已恢复本地草稿；保存时仍会检查仓库版本。';
  } catch (e) { error.value = errorMessage(e); }
}
function discardBackup() { try { localStorage.removeItem(storageKey); } catch { /* Optional local storage. */ } recovery.value = false; }
function flush() {
  if (editor && richReady) body.value = editor.getValue();
  if (ready.value && dirty.value) try { localStorage.setItem(storageKey, snapshot()); } catch { /* Optional local backup. */ }
}
function destroyEditor(sync = true) {
  if (sync) flush();
  generation++; richReady = false;
  const old = editor; editor = undefined; old?.destroy();
}
function readRichSoon() { queueMicrotask(flush); }
defineExpose({ flush });
async function changeMode(next: typeof mode.value) {
  destroyEditor(); mode.value = next;
  const instance = generation;
  if (next !== 'rich') return;
  if (shortcode.value) { mode.value = 'source'; return; }
  try {
    const { default: Vditor } = await import('vditor'); await nextTick();
    if (!alive || instance !== generation || mode.value !== 'rich' || !editorElement.value) return;
    editor = new Vditor(editorElement.value, { cdn: `${location.origin}/vendor/vditor`, mode: 'ir', value: body.value, height: 560, lang: locale.value === 'zh-CN' ? 'zh_CN' : 'en_US',
      cache: { enable: false }, counter: { enable: false }, theme: window.document.documentElement.dataset.theme === 'dark' ? 'dark' : 'classic',
      preview: { markdown: { toc: false, sanitize: true }, hljs: { enable: false }, math: { engine: 'KaTeX' } },
      toolbar: ['headings', 'bold', 'italic', 'strike', '|', 'list', 'ordered-list', 'check', '|', 'quote', 'code', 'inline-code', 'link', 'table', '|', 'undo', 'redo'],
      input: value => { if (alive && generation === instance && richReady) body.value = value; }, after: () => { if (generation === instance) richReady = true; } });
  } catch (e) { error.value = errorMessage(e); mode.value = 'source'; }
}
async function save() {
  flush();
  if (settingsDirty.value) {
    const groups = (template: string, content: string) => pageProfile(template, content).groups.map(group => group.id).join(',');
    if (groups(String(values.value.template || 'page/empty.html'), body.value) !== groups(savedTemplate.value, originalBody.value)) {
      error.value = '这次正文修改会改变页面配置入口，请先保存或放弃页面设置，再保存正文'; return;
    }
  }
  busy.value = true; error.value = ''; message.value = '';
  const submittedBody = body.value, submittedValues = JSON.parse(JSON.stringify(values.value));
  try {
    const result = await api<SaveResult>('/document', 'PUT', { path: props.path, body: submittedBody, changes: changes.value, revision: revision.value });
    revision.value = result.revision; baseline.value = submittedValues; originalBody.value = submittedBody; message.value = result.message;
    if (!dirty.value) discardBackup(); else try { localStorage.setItem(storageKey, snapshot()); } catch { /* Optional local storage. */ }
  } catch (e) { error.value = errorMessage(e); }
  finally { busy.value = false; }
}
async function remove() {
  if (!revision.value || !confirm(t('确认删除这份内容？仓库删除后仍需构建网站。'))) return;
  busy.value = true; error.value = '';
  try { await api('/document', 'DELETE', { path: props.path, revision: revision.value }); discardBackup(); emit('dirty', false); emit('back'); }
  catch (e) { error.value = errorMessage(e); } finally { busy.value = false; }
}
function download() {
  flush();
  const blob = new Blob([JSON.stringify({ path: props.path, metadata: values.value, body: body.value }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'studio-draft.json'; link.click(); URL.revokeObjectURL(url);
}
watch(locale, () => { if (mode.value === 'rich') void changeMode('rich'); });
onBeforeUnmount(() => { flush(); alive = false; destroyEditor(false); emit('dirty', false); });
</script>
<template>
  <div v-if="loading" class="loading-state">{{ t("正在载入文稿…") }}</div>
  <section v-else class="editor-page"><div class="page-heading"><div><button class="text-button" @click="emit('back')">{{ t("← 返回内容库") }}</button><h1>{{ values.title || t("未命名内容") }}</h1><p class="muted path-label">{{ path }}</p></div><div class="row"><button class="secondary" @click="download">{{ t("下载备份") }}</button><button class="primary" :disabled="busy || !dirty" @click="save">{{ busy ? t("正在保存…") : t("保存内容") }}</button></div></div>
    <p v-if="error" class="notice error" role="alert">{{ t(error) }} {{ t("编辑内容已保留。如有版本冲突，请先下载备份，再重新打开文件合并。") }}</p><p v-if="message" class="notice success" role="status">{{ t(message) }}</p>
    <div v-if="recovery" class="notice row">{{ t("发现本地草稿备份。") }}<button class="text-button" @click="restore">{{ t("恢复草稿") }}</button><button class="text-button" @click="discardBackup">{{ t("丢弃备份") }}</button></div>
    <div v-if="isPage" class="page-editor-tabs"><button :class="{ active: pageTab === 'content' }" @click="pageTab = 'content'">{{ t("正文与属性") }}</button><button :class="{ active: pageTab === 'settings' }" :disabled="busy" @click="showPageSettings">{{ t("页面设置") }}<span v-if="settingsDirty" :aria-label="t('未保存')"> ·</span></button></div>
    <div v-if="isPage && settingsOpened" v-show="pageTab === 'settings'" class="page-settings-pane" :inert="busy"><p v-if="!revision || templateChanged" class="notice">{{ t("请先保存页面内容与模板，再编辑对应的页面设置。") }}</p><PageSettings v-else :key="savedTemplate" :template="savedTemplate" :body="originalBody" @dirty="settingsDirty = $event" /></div>
    <p v-if="isPage && pageTab === 'content'" class="editor-hint">{{ t(pageProfile(String(values.template || ''), body).description) }}</p>
    <div v-show="!isPage || pageTab === 'content'" class="editor-layout"><div class="card writing-card"><label class="field title-field">{{ t("标题") }}<input v-model="values.title" :placeholder="t('为这篇内容写一个标题…')" /></label><label class="field">{{ t("摘要") }}<textarea :value="String(values.description ?? '')" @input="values.description = ($event.target as HTMLTextAreaElement).value" rows="2" :placeholder="t('用一两句话介绍这篇内容')" /></label>
      <div class="editor-tabs"><button :class="{ active: mode === 'source' }" @click="changeMode('source')">{{ t("Markdown 源码") }}</button><button :disabled="shortcode" :class="{ active: mode === 'rich' }" @click="changeMode('rich')">{{ t("可视化编辑") }}</button><button :class="{ active: mode === 'preview' }" @click="changeMode('preview')">{{ t("正文预览") }}</button><button :disabled="busy || mode !== 'source'" :title="mode !== 'source' ? t('切换到 Markdown 源码后插入图片') : t('从仓库选择图片插入正文')" @click="chooseImage">{{ t("插入图片") }}</button><span class="muted small">{{ t("{count} 字符", { count: wordCount }) }}</span></div>
      <p v-if="shortcode" class="editor-hint">{{ t("包含 Zola shortcode，使用源码编辑以保留原始结构。") }}</p>
      <textarea v-if="mode === 'source'" ref="sourceElement" v-model="body" class="markdown-source" :aria-label="t('Markdown 正文')" :placeholder="t('从这里开始书写…')" spellcheck="false" />
      <div v-else-if="mode === 'rich'" ref="editorElement" @input="readRichSoon" @click="readRichSoon" />
      <div v-else><p class="editor-hint">{{ t("这里只预览 Markdown；shortcode 和主题页面请在 Zola 构建后查看。") }}</p><article class="markdown-preview" v-html="preview" /></div>
      <div class="list-footer">{{ dirty ? t("有未保存的更改 · 已在此浏览器备份") : t("已保存") }}</div>
    </div><aside class="editor-aside"><div class="card metadata-card"><h2>{{ t("内容属性") }}</h2><label class="field checkbox-field"><input v-model="values.draft" type="checkbox" />{{ t("保留为草稿") }}</label><p class="muted small">{{ t("取消草稿并保存后，由网站构建流程决定何时上线。") }}</p>
      <p v-if="choicesError" class="notice error" role="alert">{{ t("选项载入失败：") }}{{ t(choicesError) }} <button class="text-button" @click="loadChoices">{{ t("重试选项") }}</button></p>
      <template v-for="field in visibleFields" :key="field.path">
        <ChoiceSelect v-if="field.kind === 'structured'" :model-value="values[field.path] ?? field.default" :options="choices[field.path] || []" :disabled="choicesLoading" :name="field.path" :label="t(field.label)" :hint="t('可多选；新增名称请前往「标签与分类」。')" @update:model-value="values[field.path] = $event" />
        <SelectionField v-else-if="fixedChoices[field.path]" :model-value="values[field.path]" :options="selectOptions(field.path)" :name="field.path" :label="t(field.label)" :disabled="field.path === 'template' && settingsDirty" :hint="field.path === 'template' && settingsDirty ? t('请先保存页面设置，再更换模板。') : !values[field.path] ? t('留空时使用站点默认设置。') : undefined" @update:model-value="values[field.path] = $event" />
        <FormField v-else v-model="values[field.path]" :name="field.path" :label="t(field.label)" :kind="field.kind" :hint="t(field.hint)" :document-path="path" :required="field.path === 'date' && !isSection && !isPage" />
      </template>
      <button v-if="revision" class="text-button danger" :disabled="busy || settingsDirty" @click="remove">{{ t("删除这份内容") }}</button>
    </div></aside></div>
    <MediaPicker v-if="imagePicker" mode="document" :document-path="path" @select="insertImage" @close="imagePicker = false" />
  </section>
</template>
