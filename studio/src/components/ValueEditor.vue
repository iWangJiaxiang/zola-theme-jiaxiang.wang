<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref } from 'vue';
import type { Json } from '../../shared/types';
import { fieldLabels } from '../../shared/settings';
import { newItem, localDate, fieldControl, fieldChoices, isLinkField, isPostReference } from '../../shared/form-fields';
import FormField from './FormField.vue';
import { isImageField } from '../../shared/media';
const props = defineProps<{ modelValue: Json; name: string; label?: string; depth?: number; sprite?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: Json] }>();
const newKey = ref('');
const label = computed(() => t(props.label || fieldLabels[props.name.split('.').at(-1)!] || props.name.split('.').at(-1)));
const depth = computed(() => props.depth || 0);
const object = computed(() => props.modelValue && !Array.isArray(props.modelValue) && typeof props.modelValue === 'object' ? props.modelValue : {});
function compactObject(value: Json, path: string): boolean {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.length <= 4 && entries.every(([key, item]) => {
    const field = `${path}.${key}`;
    return (item === null || typeof item !== 'object') && fieldControl(field) === 'text'
      && !fieldChoices(field) && !isImageField(field) && !isLinkField(field) && !isPostReference(field)
      && !(typeof item === 'string' && (item.includes('\n') || item.length > 160));
  });
}
function compactItem(value: Json, index: number): boolean {
  const path = `${props.name}.${index}`;
  return value !== null && typeof value === 'object' ? compactObject(value, path)
    : !isImageField(path) && fieldControl(path) !== 'emoji';
}
function changeItem(index: number, value?: Json) {
  const items = [...props.modelValue as Json[]];
  if (value === undefined) items.splice(index, 1); else items[index] = value;
  emit('update:modelValue', items);
}
function move(index: number, direction: number) {
  const items = [...props.modelValue as Json[]];
  [items[index], items[index + direction]] = [items[index + direction], items[index]];
  emit('update:modelValue', items);
}
function addItem() {
  emit('update:modelValue', [...props.modelValue as Json[], newItem(props.name, localDate(), (props.modelValue as Json[])[0])]);
}
function addKey() {
  const key = newKey.value.trim();
  if (!/^[A-Za-z_][\w-]*$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) return;
  if (Object.hasOwn(object.value, key)) return;
  emit('update:modelValue', { ...object.value, [key]: '' }); newKey.value = '';
}
</script>
<template>
  <div v-if="Array.isArray(modelValue)" class="structured" :data-structured="name" :class="{ nested: depth > 0 }">
    <div class="structured-heading"><span>{{ label }}</span><span class="count">{{ modelValue.length }}</span></div>
    <p v-if="!modelValue.length" class="muted small">{{ t("暂未添加内容") }}</p>
    <div v-for="(item, index) in modelValue" :key="index" class="structured-item" :class="{ 'compact-item': compactItem(item, index) }">
      <div class="item-actions"><span class="item-number">{{ String(index + 1).padStart(2, '0') }}</span><button type="button" class="icon-button" :disabled="index === 0" :aria-label="t('上移{p0}第{p1}项', { p0: label, p1: index + 1 })" @click="move(index, -1)">↑</button><button type="button" class="icon-button" :disabled="index === modelValue.length - 1" :aria-label="t('下移{p0}第{p1}项', { p0: label, p1: index + 1 })" @click="move(index, 1)">↓</button><button type="button" class="text-button danger" :aria-label="t('删除{p0}第{p1}项', { p0: label, p1: index + 1 })" @click="changeItem(index)">{{ t("移除") }}</button></div>
      <ValueEditor :model-value="item" :name="`${name}.${index}`" :label="`${label} ${index + 1}`" :depth="depth + 1" :sprite="sprite" @update:model-value="changeItem(index, $event)" />
    </div>
    <button type="button" class="add-button" @click="addItem">{{ t("＋ 添加{label}", { label }) }}</button>
  </div>
  <div v-else-if="modelValue !== null && typeof modelValue === 'object'" class="object-fields" :class="{ 'compact-object': compactObject(modelValue, name) }">
    <ValueEditor v-for="(value, key) in object" :key="key" :class="{ 'value-number': typeof value === 'number' }" :model-value="value" :name="`${name}.${key}`" :label="fieldLabels[key] || key" :depth="depth + 1" :sprite="typeof object.svg_sprite === 'string' && object.svg_sprite ? object.svg_sprite : sprite" @update:model-value="emit('update:modelValue', { ...object, [key]: $event })" />
    <details class="advanced-field"><summary>{{ t("添加扩展字段") }}</summary><div class="row"><input v-model="newKey" :aria-label="t('扩展字段名称')" :placeholder="t('字段名称')" /><button type="button" class="secondary" @click="addKey">{{ t("添加") }}</button></div></details>
  </div>
  <FormField v-else :model-value="modelValue" :name="name" :label="String(label)" :sprite="sprite" @update:model-value="emit('update:modelValue', $event)" />
</template>
