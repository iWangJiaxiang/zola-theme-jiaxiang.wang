<script setup lang="ts">
import { t } from '../i18n';
import { computed, ref, watch, useId, nextTick, onBeforeUnmount } from 'vue';
import type { Json } from '../../shared/types';
import type { Choice } from '../../shared/choices';
import ChoicePreview from './ChoicePreview.vue';
const props = defineProps<{ modelValue: Json | undefined; options: Choice[]; name: string; label: string; multiple?: boolean; disabled?: boolean; hint?: string; preview?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>();
const id = useId(), dialog = ref<HTMLDialogElement>(), trigger = ref<HTMLButtonElement>();
const opened = ref(false), search = ref(''), pending = ref<string[]>([]), known = ref<string[]>([]);
const selected = computed(() => props.multiple ? Array.isArray(props.modelValue) ? props.modelValue.filter((v): v is string => typeof v === 'string' && !!v) : [] : [String(props.modelValue ?? '')]);
watch(selected, values => { known.value = [...new Set([...known.value, ...values.filter(Boolean)])]; }, { immediate: true });
const options = computed(() => [...props.options, ...known.value.filter(value => !props.options.some(option => option.value === value)).map(value => ({ value, label: t('{value}（自定义）', { value }) }))]);
const filtered = computed(() => options.value.filter(option => `${option.label} ${option.value}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
const labels = computed(() => new Map(options.value.map(option => [option.value, option.label])));
function toggle(values: string[], value: string): string[] { return props.multiple ? values.includes(value) ? values.filter(item => item !== value) : [...values, value] : [value]; }
function publish(values: string[]) { if (!props.disabled) emit('update:modelValue', props.multiple ? values : values[0] ?? ''); }
async function open() {
  if (props.disabled) return;
  pending.value = [...selected.value]; search.value = ''; opened.value = true;
  await nextTick(); dialog.value?.showModal();
}
function close() { dialog.value?.close(); opened.value = false; trigger.value?.focus(); }
function confirm() { publish(pending.value); close(); }
watch(() => props.disabled, disabled => { if (disabled && opened.value) close(); });
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <div class="field choice-field" :data-field="name">
    <span :id="`${id}-label`">{{ label }}</span>
    <fieldset v-if="options.length <= 5" class="choice-options" :disabled="disabled" :aria-labelledby="`${id}-label`">
      <label v-for="option in options" :key="option.value" class="choice-tile" :class="{ selected: selected.includes(option.value) }">
        <input :type="multiple ? 'checkbox' : 'radio'" :name="name" :value="option.value" :checked="selected.includes(option.value)" @change="publish(toggle(selected, option.value))" />
        <ChoicePreview :value="option.value" :kind="preview" /><span>{{ option.label }}</span>
      </label>
      <small v-if="!options.length" class="muted">{{ t("暂无可选项，请先添加关联内容。") }}</small>
    </fieldset>
    <button v-else ref="trigger" type="button" class="secondary choice-trigger" :name="name" :disabled="disabled" aria-haspopup="dialog" :aria-expanded="opened" :aria-labelledby="`${id}-label ${id}-value`" @click="open">
      <ChoicePreview v-if="!multiple" :value="selected[0] || ''" :kind="preview" />
      <span :id="`${id}-value`">{{ multiple ? t("选择{p0}{p1}", { p0: label, p1: selected.length ? t("（已选 {p0} 项）", { p0: selected.length }) : '' }) : labels.get(selected[0]) || t("请选择…") }}</span><span aria-hidden="true">⌄</span>
    </button>
    <div v-if="multiple && selected.length" class="selected-choices" :aria-label="t('已选{p0}', { p0: label })">
      <button v-for="(value, index) in selected" :key="`${value}-${index}`" type="button" :disabled="disabled" :aria-label="t('移除{p0}：{p1}', { p0: label, p1: labels.get(value) || value })" @click="publish(selected.filter((_, i) => i !== index))">{{ labels.get(value) || value }} <span aria-hidden="true">×</span></button>
    </div>
    <small v-if="hint" class="muted">{{ hint }}</small>
    <Teleport to="body"><dialog v-if="opened" ref="dialog" class="selection-dialog" :aria-labelledby="`${id}-title`" @cancel.prevent="close" @click="($event.target === dialog) && close()">
      <div class="selection-panel"><div class="card-heading"><h2 :id="`${id}-title`">{{ t("选择{label}", { label }) }}</h2><button type="button" class="text-button" @click="close">{{ t("取消") }}</button></div>
        <label class="field selection-search">{{ t("搜索选项") }}<input v-model="search" type="search" @keydown.enter.prevent autofocus :placeholder="t('输入名称搜索…')" /></label>
        <fieldset class="selection-results" :aria-label="label"><label v-for="option in filtered" :key="option.value" class="choice-tile" :class="{ selected: pending.includes(option.value) }"><input :type="multiple ? 'checkbox' : 'radio'" :name="`${name}-dialog`" :value="option.value" :checked="pending.includes(option.value)" @change="pending = toggle(pending, option.value)" /><ChoicePreview :value="option.value" :kind="preview" /><span>{{ option.label }}</span></label><p v-if="!filtered.length" class="muted">{{ t("没有匹配的选项") }}</p></fieldset>
        <div class="selection-footer"><small class="muted">{{ multiple ? t("已选 {p0} 项", { p0: pending.length }) : t("单选") }} · {{ t("共 {count} 项", { count: options.length }) }}</small><button type="button" class="primary" :disabled="disabled || (!multiple && !options.some(option => option.value === pending[0]))" @click="confirm">{{ t("确认选择") }}</button></div>
      </div>
    </dialog></Teleport>
  </div>
</template>
