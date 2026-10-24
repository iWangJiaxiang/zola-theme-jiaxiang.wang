<script setup lang="ts">
import { t, translateOptions, type Message } from '../i18n';
import { ref, computed, onMounted, watch } from 'vue';
import type { ArticleSummary, Json, Settings } from '../../shared/types';
import { api, errorMessage } from '../api';
import Icon from './Icon.vue';
import SelectionField from './SelectionField.vue';
import { localDate } from '../../shared/form-fields';
import { collectionChoices, taxonomyChoices } from '../../shared/choices';
import { collectionRoot, contentLabel, displayTitle, isLibraryItem, isSection, parentSection, sectionDirectory, sectionTrail, sortLibrary } from '../../shared/library';
import { pageProfile, pageTemplateChoices } from '../../shared/page-settings';
const props = defineProps<{ kind: 'article' | 'page' | 'collection'; folder?: string }>();
const emit = defineEmits<{ open: [path: string]; create: [path: string, metadata: Record<string, Json>]; browse: [path: string] }>();
const items = ref<ArticleSummary[]>([]), search = ref(''), status = ref('all'), error = ref<Message>(''), loading = ref(true);
const folder = ref(props.folder || collectionRoot), pageNumber = ref(1), pageSize = 20;
const tagLabels = ref(new Map<string, string>()), categoryLabels = ref(new Map<string, string>());
const creating = ref(false), title = ref(''), slug = ref(''), parent = ref(''), subtype = ref('collection'), articleCollection = ref(''), pageTemplate = ref('page/empty.html');
const parents = computed(() => collectionChoices(items.value, subtype.value === 'chapter'));
const collections = computed(() => collectionChoices(items.value, true));
watch(subtype, () => { parent.value = ''; }, { flush: 'sync' });
watch([search, status, folder], () => { pageNumber.value = 1; });
const names = { article: '文章', page: '页面', collection: '专栏与合集' };
const currentSection = computed(() => items.value.find(item => item.path === folder.value));
const trail = computed(() => sectionTrail(folder.value, items.value));
const searchable = computed(() => !!search.value.trim() || status.value !== 'all');
const visible = computed(() => items.value.filter(item => item.kind === props.kind && isLibraryItem(item)));
const filtered = computed(() => sortLibrary(visible.value.filter(item => {
  const text = [displayTitle(item), item.description, ...item.tags.map(tag => tagLabels.value.get(tag) || tag), ...item.categories.map(category => categoryLabels.value.get(category) || category), ...sectionTrail(item.path, items.value).map(displayTitle)].join(' ').toLowerCase();
  const matches = text.includes(search.value.trim().toLowerCase()) && (status.value === 'all' || (status.value === 'draft' ? item.draft : !item.draft && item.render !== false && !item.error));
  return matches && (props.kind !== 'collection' || searchable.value || parentSection(item, items.value) === folder.value);
}), props.kind));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const rows = computed(() => filtered.value.slice((pageNumber.value - 1) * pageSize, pageNumber.value * pageSize));
function browse(path: string) { folder.value = path; search.value = ''; status.value = 'all'; emit('browse', path); }
function openItem(item: ArticleSummary) { if (props.kind === 'collection' && isSection(item)) browse(item.path); else emit('open', item.path); }
function sectionCount(item: ArticleSummary) {
  const children = visible.value.filter(child => child.path !== item.path && child.path.startsWith(sectionDirectory(item.path)));
  const sections = children.filter(isSection).length;
  return [sections ? t('{count} 个分组', { count: sections }) : '', t('{count} 个章节', { count: children.length - sections })].filter(Boolean).join(' · ');
}
function summary(item: ArticleSummary) {
  if (item.error) return t('内容格式异常，请打开检查');
  if (props.kind === 'collection' && isSection(item)) return sectionCount(item);
  if (props.kind === 'page') return t(pageProfile(item.template || '').label);
  const labels = item.categories.map(category => categoryLabels.value.get(category) || category);
  const ancestors = props.kind === 'collection' ? sectionTrail(item.path, items.value).map(displayTitle) : [];
  return [...ancestors, item.date.slice(0, 10), ...labels].filter(Boolean).join(' · ') || t('尚未设置日期与分类');
}
function startCreate() {
  title.value = ''; slug.value = ''; articleCollection.value = ''; pageTemplate.value = 'page/empty.html';
  subtype.value = folder.value === collectionRoot ? 'column' : currentSection.value?.template === 'page/collection-list.html' ? 'collection' : 'chapter';
  parent.value = folder.value === collectionRoot ? '' : sectionDirectory(folder.value).slice('content/collections/'.length, -1);
  creating.value = true;
}
onMounted(async () => {
  const labels = api<Settings>('/settings/taxonomies').then(settings => {
    tagLabels.value = new Map(taxonomyChoices(settings.values['post.tags'], []).map(option => [option.value, option.label]));
    categoryLabels.value = new Map(taxonomyChoices(settings.values['post.categories'], []).map(option => [option.value, option.label]));
  }).catch(() => { /* Keep stored labels visible if the dictionary cannot be read. */ });
  try {
    items.value = await api('/content');
    if (!items.value.some(item => item.path === folder.value)) browse(collectionRoot);
  } catch (e) { error.value = errorMessage(e); }
  finally { loading.value = false; }
  await labels;
});
function create() {
  if (!title.value.trim() || !/^[a-z0-9][a-z0-9-]*$/.test(slug.value)) { error.value = '请填写标题，网址标识使用小写字母、数字和连字符。'; return; }
  const metadata: Record<string, Json> = { title: title.value.trim(), draft: true };
  let path = '';
  if (props.kind === 'article') {
    if (articleCollection.value && !collections.value.some(option => option.value === articleCollection.value)) { error.value = '请选择已有合集。'; return; }
    path = articleCollection.value ? `content/collections/${articleCollection.value}/${slug.value}/index.md` : `content/articles/${slug.value}/index.md`;
    metadata.date = localDate();
    if (articleCollection.value) metadata.template = 'page/collection-content.html';
  }
  if (props.kind === 'page') { path = `content/pages/${slug.value}.md`; metadata.template = pageTemplate.value; }
  if (props.kind === 'collection') {
    if (subtype.value !== 'chapter') { metadata['extra.cover'] = '/img/default-cover.webp'; metadata['extra.tags'] = []; }
    if (subtype.value !== 'column' && !parents.value.some(option => option.value === parent.value)) { error.value = '请选择已有的专栏或合集。'; return; }
    const directory = subtype.value === 'column' ? slug.value : `${parent.value}/${slug.value}`;
    path = `content/collections/${directory}/${subtype.value === 'chapter' ? 'index' : '_index'}.md`;
    if (subtype.value === 'column') metadata.template = 'page/collection-list.html';
    else if (subtype.value === 'collection') { metadata.template = 'page/collection-detail.html'; metadata.page_template = 'page/collection-content.html'; metadata.render = true; metadata.insert_anchor_links = 'heading'; }
    else metadata.template = 'page/collection-content.html';
  }
  error.value = ''; emit('create', path, metadata);
}
</script>
<template>
  <section class="content-library"><div class="page-heading"><div><p class="eyebrow">{{ t("内容管理") }}</p><h1>{{ t(names[kind]) }}</h1><p class="muted">{{ kind === 'collection' ? t("按专栏、合集和章节整理内容。") : kind === 'page' ? t("选择页面，编辑正文和对应模板的专属设置。") : t("按时间整理文章，继续未完成的创作。") }}</p></div><button class="primary" :disabled="loading" @click="startCreate"><Icon name="plus" />{{ t(kind === 'article' ? t("新建文章") : kind === 'page' ? t("新建页面") : t("新建内容")) }}</button></div>
    <p v-if="error && !creating" class="notice error" role="alert">{{ t(error) }}</p>
    <div v-if="kind === 'collection'" class="collection-navigation"><nav :aria-label="t('专栏层级')"><button class="text-button" @click="browse(collectionRoot)">{{ t("全部专栏") }}</button><template v-for="section in trail" :key="section.path"><span aria-hidden="true">/</span><button class="text-button" @click="browse(section.path)">{{ displayTitle(section) }}</button></template></nav><button v-if="currentSection" class="secondary" @click="emit('open', currentSection.path)">{{ folder === collectionRoot ? t("合集首页设置") : t("当前分组设置") }}</button></div>
    <div class="card"><div class="library-toolbar"><div class="search-box"><Icon name="search" /><input v-model="search" :aria-label="t('搜索内容')" :placeholder="kind === 'collection' ? t('搜索全部专栏、合集和章节…') : t('搜索标题、标签或分类…')" /></div><SelectionField :model-value="status" name="status" :label="t('筛选状态')" :options="[{value:'all',label:t('全部状态')},{value:'draft',label:t('草稿')},{value:'published',label:t('已发布')}]" @update:model-value="status = String($event)" /></div>
      <div v-if="loading" class="empty-state">{{ t("正在读取内容…") }}</div>
      <div v-else-if="!filtered.length" class="empty-state"><Icon name="book" :size="36" /><h2>{{ searchable ? t("没有找到匹配内容") : t("这里还没有内容") }}</h2><p class="muted">{{ searchable ? t("试试其他关键词或筛选条件。") : t("点击上方按钮，新建内容。") }}</p></div>
      <div v-for="item in rows" :key="item.path" class="library-row">
        <button class="content-row" :data-path="item.path" @click="openItem(item)"><span class="content-icon"><Icon :name="isSection(item) ? 'folder' : 'file'" /></span><span class="content-info"><span class="content-title"><strong>{{ displayTitle(item) }}</strong><span v-if="kind === 'collection'" class="content-kind">{{ t(contentLabel(item)) }}</span></span><small>{{ summary(item) }}</small><span v-if="item.description" class="content-description">{{ item.description }}</span><span v-if="item.tags.length" class="tags"><span v-for="tag in item.tags.slice(0, 5)" :key="tag"># {{ tagLabels.get(tag) || tag }}</span><span v-if="item.tags.length > 5">+{{ item.tags.length - 5 }}</span></span></span><span :class="['badge', { draft: item.draft, invalid: item.error }]">{{ item.error ? t("需要检查") : item.render === false ? t("仅作分组") : item.draft ? t("草稿") : t("已发布") }}</span><Icon name="arrow" /></button>
        <button v-if="kind === 'collection' && isSection(item)" class="text-button section-edit" :aria-label="t('编辑{p0}设置', { p0: displayTitle(item) })" @click="emit('open', item.path)">{{ t("设置") }}</button>
      </div>
      <div class="list-footer library-footer"><span>{{ t("共 {count} 项", { count: filtered.length }) }}{{ kind === 'collection' && !searchable ? t(" · 当前层级") : '' }} · {{ t("网站内容将在下次部署后更新") }}</span><div v-if="pages > 1" class="row"><button class="text-button" :disabled="pageNumber <= 1" @click="pageNumber--">{{ t("上一页") }}</button><span>{{ pageNumber }} / {{ pages }}</span><button class="text-button" :disabled="pageNumber >= pages" @click="pageNumber++">{{ t("下一页") }}</button></div></div>
    </div>
    <div v-if="creating" class="modal-backdrop" @click.self="creating = false"><form class="card modal" @submit.prevent="create"><div class="card-heading"><h2>{{ t("新建内容") }}</h2><button type="button" class="text-button" @click="creating = false">{{ t("取消") }}</button></div>
      <p v-if="error" class="notice error" role="alert">{{ t(error) }}</p>
      <SelectionField v-if="kind === 'collection'" :model-value="subtype" name="content-type" :label="t('内容类型')" :options="[{value:'column',label:t('专栏（一级分组）')},{value:'collection',label:t('合集（章节集合）')},{value:'chapter',label:t('章节（正文）')}]" @update:model-value="subtype = String($event)" />
      <label class="field">{{ t("标题") }}<input v-model="title" required autofocus :placeholder="t('给它取个名字')" /></label><label class="field">{{ t("网址标识") }}<input v-model="slug" required pattern="[a-z0-9][a-z0-9-]*" placeholder="my-first-story" /><small class="muted">{{ t("用于生成地址，创建后不能在后台重命名。") }}</small></label>
      <SelectionField v-if="kind === 'page'" :model-value="pageTemplate" name="page-template" :label="t('页面类型')" :options="translateOptions(pageTemplateChoices)" @update:model-value="pageTemplate = String($event)" />
      <SelectionField v-if="kind === 'article'" :model-value="articleCollection" name="article-collection" :label="t('所属合集')" :options="[{value:'',label:t('独立文章（不加入合集）')}, ...collections]" :disabled="loading" :hint="t('加入合集后会作为章节显示。新合集请在「专栏与合集」中创建。')" @update:model-value="articleCollection = String($event)" />
      <SelectionField v-if="kind === 'collection' && subtype !== 'column'" :model-value="parent" name="collection-parent" :label="subtype === 'chapter' ? t('所属合集') : t('所属专栏 / 合集')" :options="parents" :disabled="loading || !parents.length" :hint="t('先创建对应专栏或合集，再添加子内容。')" @update:model-value="parent = String($event)" />
      <button class="primary wide" :disabled="loading || (kind === 'collection' && subtype !== 'column' && !parent)">{{ t("进入编辑器") }}<Icon name="arrow" /></button></form></div>
  </section>
</template>
