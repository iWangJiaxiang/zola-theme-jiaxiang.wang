<script setup lang="ts">
import { t } from '../i18n';
import { onMounted, onBeforeUnmount, ref, watch, useId } from 'vue';
import { reauthentication } from '../api';
import { mediaError, mediaLoading, mediaUploading, mediaVersion, mediaListing } from '../media-store';
import type { MediaItem, MediaMode } from '../../shared/media';
import MediaBrowser from './MediaBrowser.vue';
const props = withDefaults(defineProps<{ mode: MediaMode; documentPath?: string; selected?: string; svgOnly?: boolean }>(), { selected: '', documentPath: '', svgOnly: false });
const emit = defineEmits<{ select: [item: MediaItem, value: string]; close: [] }>();
const dialog = ref<HTMLDialogElement>(), pending = ref<{ item: MediaItem; value: string }>();
const id = useId();
let previousFocus: HTMLElement | null = null;
onMounted(() => { previousFocus = document.activeElement as HTMLElement; dialog.value?.showModal(); });
function close(force = false) { if (mediaUploading.value && !force) return; dialog.value?.close(); emit('close'); }
function confirm() { if (pending.value && !mediaLoading.value && !mediaUploading.value && !mediaError.value) { emit('select', pending.value.item, pending.value.value); close(); } }
watch(mediaVersion, () => { if (pending.value && !mediaListing.value.items.some(item => item.path === pending.value?.item.path && !item.unavailable)) pending.value = undefined; });
watch(reauthentication, value => { if (value) close(true); });
onBeforeUnmount(() => { dialog.value?.close(); if (previousFocus?.isConnected) previousFocus.focus(); });
</script>
<template><Teleport to="body"><dialog ref="dialog" class="media-dialog" :aria-labelledby="id" @cancel.prevent="close()" @click="($event.target === dialog) && close()"><div class="media-dialog-panel"><div class="card-heading"><h2 :id="id">{{ t("选择或上传图片") }}</h2><button type="button" class="text-button" :disabled="mediaUploading" @click="close()">{{ t("取消") }}</button></div><div class="media-dialog-body"><MediaBrowser :mode="mode" :document-path="documentPath" :selected="pending?.item.path || selected" :svg-only="svgOnly" @select="(item, value) => pending = { item, value }" /></div><div class="selection-footer"><small class="muted media-pending">{{ pending ? t("将填写：{p0}", { p0: pending.value }) : t("选中图片后确认，取消不会修改表单") }}</small><button type="button" class="primary" :disabled="!pending || mediaLoading || mediaUploading || !!mediaError" @click="confirm">{{ t("使用这张图片") }}</button></div></div></dialog></Teleport></template>
