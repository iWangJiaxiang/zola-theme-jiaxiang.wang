<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, watch, onMounted } from 'vue';
import { mediaListing, mediaLoading, mediaError, mediaVersion, mediaUploading, loadMedia } from '../media-store';
import { mediaValue, mediaURL, supportsColocatedMedia, imageExtension, formatBytes, type MediaItem, type MediaMode } from '../../shared/media';
import SelectionField from './SelectionField.vue';
import Icon from './Icon.vue';
import MediaUpload from './MediaUpload.vue';
const props = withDefaults(defineProps<{ mode?: MediaMode; documentPath?: string; selected?: string; svgOnly?: boolean }>(), { mode: 'library', documentPath: '', selected: '', svgOnly: false });
const emit = defineEmits<{ select: [item: MediaItem, value: string] }>();
const search = ref(''), source = ref('all'), folder = ref(''), page = ref(1), failed = ref(new Set<string>());
const eligible = computed(() => mediaListing.value.items.filter(item => (!props.svgOnly || imageExtension(item.path) === 'svg') && (props.mode === 'library' || mediaValue(item, props.mode, props.documentPath) !== null)));
const folders = computed(() => [{ value: '', label: t('全部文件夹') }, ...[...new Set(eligible.value.map(item => item.directory))].sort().map(value => ({ value, label: value }))]);
const filtered = computed(() => eligible.value.filter(item => (!folder.value || item.directory === folder.value) && (source.value === 'all' || item.path.startsWith(source.value + '/')) && item.path.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 24)));
const items = computed(() => filtered.value.slice((page.value - 1) * 24, page.value * 24));
watch([search, source, folder], () => { page.value = 1; });
watch(mediaVersion, () => { failed.value = new Set(); if (!folders.value.some(item => item.value === folder.value)) folder.value = ''; page.value = 1; });
onMounted(() => { void loadMedia(); });
function uploaded(item: MediaItem) { search.value = ''; source.value = 'all'; folder.value = ''; page.value = 1; const value = mediaValue(item, props.mode, props.documentPath); if (value !== null) emit('select', item, value); }
function choose(item: MediaItem) { const value = mediaValue(item, props.mode, props.documentPath); if (value !== null && !mediaLoading.value && !mediaError.value) emit('select', item, value); }
</script>
<template>
  <div class="media-browser" :aria-busy="mediaLoading || mediaUploading">
    <MediaUpload :mode="mode" :document-path="documentPath" :svg-only="svgOnly" @uploaded="uploaded" />
    <div class="media-toolbar"><label class="field media-search">{{ t("搜索图片") }}<input v-model="search" type="search" :aria-label="t('搜索仓库图片')" :placeholder="t('搜索文件名或路径…')" @keydown.enter.prevent /></label><button type="button" class="secondary" :disabled="mediaLoading || mediaUploading" @click="loadMedia(true)">{{ mediaLoading ? t("读取中…") : t("刷新仓库") }}</button></div>
    <div class="media-filters"><SelectionField v-if="mode === 'library' || mode === 'document'" :model-value="source" name="media-source" :label="t('图片来源')" :options="[{value:'all',label:t('全部')},{value:'static',label:t('公共图片')},{value:'content',label:t('内容配图')}]" @update:model-value="source = String($event)" /><SelectionField :model-value="folder" name="media-folder" :label="t('文件夹')" :options="folders" @update:model-value="folder = String($event)" /></div>
    <p v-if="mode === 'public'" class="muted small">{{ t("此字段使用公共图片，选中后自动填写站点路径。") }}</p>
    <p v-else-if="mode === 'colocated' && !supportsColocatedMedia(documentPath)" class="muted small">{{ t("此文稿不支持同目录封面，请在「公共封面」中选图。") }}</p>
    <p v-else-if="mode === 'colocated'" class="muted small">{{ t("选择当前文章目录中的图片，自动填写文件名。公共图片可在「公共封面」中选择。") }}</p>
    <p v-else-if="mode === 'document'" class="muted small">{{ supportsColocatedMedia(documentPath) ? t("可以选择公共图片或当前文稿目录中的配图。") : t("此文稿使用公共图片，选中后自动填写站点路径。") }}</p>
    <p v-if="mediaError" class="notice error" role="alert">{{ t(mediaError) }} <button type="button" class="text-button" @click="loadMedia(true)">{{ t("重试") }}</button></p>
    <p v-if="mediaListing.truncated" class="notice">{{ t("图片或目录数量超过本次扫描上限，当前仅显示部分结果。") }}</p>
    <div v-if="mediaLoading && !mediaListing.items.length" class="loading-state" role="status">{{ t("正在读取仓库图片…") }}</div>
    <div v-else-if="!filtered.length && !mediaError" class="empty-state"><Icon name="image" :size="34" /><h3>{{ t("没有找到图片") }}</h3><p class="muted small">{{ search || folder ? t("试试其他关键词或文件夹。") : mode === 'colocated' ? (supportsColocatedMedia(documentPath) ? t("上传图片后即可在这里选择。") : t("请改用公共封面选择公共图片。")) : t("上传第一张图片，或刷新仓库查看已有图片。") }}</p></div>
    <div v-else class="media-grid"><button v-for="item in items" :key="item.path" type="button" class="media-card" :class="{ selected: selected === item.path }" :data-media-path="item.path" :aria-label="t('选择图片：{p0}', { p0: item.path })" :aria-pressed="selected === item.path" :disabled="!!item.unavailable || mediaLoading || mediaUploading || !!mediaError" @click="choose(item)">
      <span class="media-thumbnail"><img v-if="!item.unavailable && !failed.has(item.path)" :src="mediaURL(item.path, mediaVersion)" alt="" loading="lazy" decoding="async" @error="failed.add(item.path)" /><span v-else class="muted small">{{ t(item.unavailable) || t("暂时无法预览") }}</span><span v-if="selected === item.path" class="media-selected-mark"><Icon name="check" :size="16" /></span></span>
      <span class="media-name">{{ item.name }}</span><span class="media-path">{{ item.directory }}</span><span class="media-size">{{ imageExtension(item.path).toUpperCase() }} · {{ formatBytes(item.size) }}</span>
    </button></div>
    <div class="media-pagination"><small class="muted">{{ t("共 {count} 张图片", { count: filtered.length }) }}</small><div v-if="pages > 1" class="row"><button type="button" class="text-button" :disabled="page <= 1" @click="page--">{{ t("上一页") }}</button><small>{{ page }} / {{ pages }}</small><button type="button" class="text-button" :disabled="page >= pages" @click="page++">{{ t("下一页") }}</button></div></div>
  </div>
</template>
