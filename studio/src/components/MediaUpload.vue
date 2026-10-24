<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { t, type Message } from '../i18n';
import { api, ApiError, errorMessage, session } from '../api';
import { mediaListing, mediaLoading, mediaUploading, addUploadedMedia } from '../media-store';
import { documentDirectory, supportsColocatedMedia, imageExtension, imageMime, mediaTypes, MAX_UPLOAD_SIZE, type MediaItem, type MediaMode, type MediaUploadResult } from '../../shared/media';
import SelectionField from './SelectionField.vue';
const props = defineProps<{ mode: MediaMode; documentPath: string; svgOnly: boolean }>();
const emit = defineEmits<{ uploaded: [item: MediaItem] }>();
const input = ref<HTMLInputElement>(), directory = ref('static/uploads'), dragging = ref(false), error = ref<Message>('');
const results = ref<{ name: string; item?: MediaItem; error?: Message }[]>([]), total = ref(0), completed = ref(0);
let disposed = false;
onBeforeUnmount(() => { disposed = true; });
const bundle = computed(() => supportsColocatedMedia(props.documentPath) ? documentDirectory(props.documentPath).replace(/\/$/, '') : '');
const destinations = computed(() => {
  const choices = props.mode === 'colocated' ? [] : [{ value: 'static/uploads', label: t('公共图片（默认）') },
    ...[...new Set(mediaListing.value.items.filter(item => item.path.startsWith('static/') && !item.directory.split('/').some(part => ['node_modules', 'public', 'processed_images'].includes(part))).map(item => item.directory))].filter(path => path !== 'static/uploads').sort().map(value => ({ value, label: value }))];
  if (bundle.value && ['document', 'colocated'].includes(props.mode)) choices.unshift({ value: bundle.value, label: t('当前文稿目录') });
  return choices;
});
watch(() => [props.mode, props.documentPath], () => { directory.value = bundle.value && ['document', 'colocated'].includes(props.mode) ? bundle.value : 'static/uploads'; }, { immediate: true });
const allowed = computed(() => destinations.value.some(choice => choice.value === directory.value));
const maxFileSize = computed(() => mediaListing.value.maxFileSize || MAX_UPLOAD_SIZE);
const disabled = computed(() => mediaUploading.value || mediaLoading.value || !allowed.value);
const accept = computed(() => props.svgOnly ? '.svg' : Object.keys(mediaTypes).map(type => '.' + type).join(','));
async function upload(files: File[]) {
  if (disabled.value || !files.length) return;
  error.value = '';
  if (files.length > 20) { error.value = '每次最多选择 20 张图片'; return; }
  const target = directory.value, identity = session.value?.identity.id;
  results.value = []; total.value = files.length; completed.value = 0; mediaUploading.value = true;
  try {
    for (const file of files) {
      if (disposed || identity !== session.value?.identity.id) break;
      try {
        if (!imageMime(file.name) || (props.svgOnly && imageExtension(file.name) !== 'svg')) throw new Error(props.svgOnly ? '请选择 SVG 图片' : '请选择支持的图片格式');
        if (!file.size) throw new Error('不能上传空文件');
        if (file.size > maxFileSize.value) throw new ApiError('每张图片不能超过 {limit} MB', 413, { limit: maxFileSize.value / 1024 / 1024 });
        const saved = await api<MediaUploadResult>('/media/upload?' + new URLSearchParams({ directory: target, filename: file.name }), 'POST', file);
        if (identity !== session.value?.identity.id) break;
        addUploadedMedia(saved.item);
        results.value.push({ name: file.name, item: saved.item });
        if (!disposed) emit('uploaded', saved.item);
      } catch (reason) {
        results.value.push({ name: file.name, error: errorMessage(reason) });
        if (reason instanceof ApiError && [401, 403, 409].includes(reason.status)) {
          for (const skipped of files.slice(completed.value + 1)) results.value.push({ name: skipped.name, error: '上传已暂停，请检查提示后重新选择未上传的图片' });
          break;
        }
      } finally { completed.value++; }
    }
  } finally { mediaUploading.value = false; }
}
function select(event: Event) { const element = event.target as HTMLInputElement; const files = Array.from(element.files || []); element.value = ''; void upload(files); }
function drop(event: DragEvent) { dragging.value = false; void upload(Array.from(event.dataTransfer?.files || [])); }
</script>
<template>
  <section class="media-upload" :class="{ dragging }" :aria-label="t('上传图片')" @dragover.prevent="dragging = !disabled" @dragleave.self="dragging = false" @drop.prevent.stop="drop">
    <template v-if="allowed">
      <div class="upload-actions"><div><strong>{{ t('上传图片') }}</strong><p class="muted small">{{ t('拖拽图片到这里，或选择文件。支持多选，每张最多 {limit} MB。', { limit: maxFileSize / 1024 / 1024 }) }}</p></div><button type="button" class="secondary" :disabled="disabled" @click="input?.click()">{{ mediaUploading ? t('上传中…') : t('选择文件') }}</button><input ref="input" class="upload-file-input" type="file" :accept="accept" multiple :disabled="disabled" :aria-label="t('选择上传图片')" @change="select" /></div>
      <SelectionField :model-value="directory" name="upload-directory" :label="t('保存位置')" :options="destinations" :disabled="mediaUploading || mediaLoading" @update:model-value="directory = String($event)" />
      <small class="muted upload-destination">{{ directory }}</small>
      <div v-if="mediaUploading" class="upload-progress" role="status"><progress :max="total" :value="completed" />{{ t('正在上传 {current}/{total}', { current: Math.min(completed + 1, total), total }) }}</div>
      <p v-if="error" class="notice error" role="alert">{{ t(error) }}</p>
      <ul v-if="results.length" class="upload-results" aria-live="polite"><li v-for="(result, index) in results" :key="index"><button v-if="result.item" type="button" class="text-button" :disabled="mediaUploading" @click="emit('uploaded', result.item)">{{ t('已上传：{name}', { name: result.item.name }) }}</button><span v-else class="upload-error">{{ result.name }} — {{ t(result.error) }}</span></li></ul>
      <p class="muted small upload-note">{{ t('上传后图片立即保存到仓库；选用后仍需保存表单。同名文件会自动改名。') }}</p>
    </template>
    <p v-else class="muted small">{{ t('此文稿不支持同目录图片，请使用公共图片。') }}</p>
  </section>
</template>
