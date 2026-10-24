<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, watch } from 'vue';
import { mediaURL, storedMediaPath, type MediaMode } from '../../shared/media';
import { mediaVersion } from '../media-store';
import MediaPicker from './MediaPicker.vue';
const props = withDefaults(defineProps<{ modelValue: string; name: string; label: string; hint?: string; mode?: MediaMode; documentPath?: string; disabled?: boolean; preview?: boolean }>(), { mode: 'public', documentPath: '', preview: true });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const opened = ref(false), failed = ref(false);
const path = computed(() => storedMediaPath(props.modelValue, props.mode, props.documentPath));
const src = computed(() => !props.preview ? '' : path.value ? mediaURL(path.value, mediaVersion.value) : /^https?:\/\//i.test(props.modelValue) ? props.modelValue : '');
watch(src, () => { failed.value = false; });
watch(() => props.disabled, value => { if (value) opened.value = false; });
</script>
<template><div class="field image-field" :data-image-field="name"><label :for="`image-${name}`">{{ label }}</label><div v-if="preview && modelValue" class="image-field-preview"><img v-if="src && !failed" :src="src" :alt="t('{p0}预览', { p0: label })" loading="lazy" decoding="async" referrerpolicy="no-referrer" @error="failed = true" /><small v-else class="muted">{{ src ? t("暂时无法预览，已保留原地址") : t("已保留原值，可从仓库选择图片") }}</small></div><input :id="`image-${name}`" :name="name" :value="modelValue" :disabled="disabled" :placeholder="t('选择、上传图片，或填写图片地址')" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" /><div class="row"><button type="button" class="secondary" :disabled="disabled" :aria-label="t('选择或上传{p0}', { p0: label })" @click="opened = true">{{ t("选择或上传") }}</button><button v-if="modelValue" type="button" class="text-button" :disabled="disabled" @click="emit('update:modelValue', '')">{{ t("清空") }}</button></div><small v-if="hint" class="muted">{{ hint }}</small><MediaPicker v-if="opened" :mode="mode" :document-path="documentPath" :selected="path || ''" :svg-only="name.endsWith('svg_sprite')" @select="(_item, value) => emit('update:modelValue', value)" @close="opened = false" /></div></template>
