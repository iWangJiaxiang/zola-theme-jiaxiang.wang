<script setup lang="ts">
import { t } from '../i18n';
import { computed, inject } from 'vue';
import type { Json } from '../../shared/types';
import { fieldControl, fieldChoices, isPostReference, isLinkField, dateParts, updateDate } from '../../shared/form-fields';
import { formContext } from '../form-context';
import { iconChoices, symbolChoices, emojiChoices, glyphs } from '../icons';
import SelectionField from './SelectionField.vue';
import ImageField from './ImageField.vue';
import { isImageField, isBackupImageField } from '../../shared/media';
import ChoicePreview from './ChoicePreview.vue';
const props = defineProps<{ modelValue: Json | undefined; name: string; label: string; hint?: string; kind?: string; disabled?: boolean; required?: boolean; documentPath?: string; sprite?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: Json] }>();
const context = inject(formContext, undefined);
const backupImage = computed(() => isBackupImageField(props.name));
const label = computed(() => t(backupImage.value ? '备用图标地址' : props.label));
const hint = computed(() => backupImage.value ? t('仅保留备用地址，后台不会自动加载或预览。展示图片请使用「本地图标」。') : t(props.hint));
const control = computed(() => fieldControl(props.name));
const imageMode = computed(() => props.name === 'extra.cover' && props.documentPath && !props.documentPath.endsWith('/_index.md') ? 'colocated' : 'public');
const text = computed(() => String(props.modelValue ?? ''));
const choiceOptions = computed(() => isPostReference(props.name) ? [{ value: '', label: t('不指定文章') }, ...(context?.posts.value || [])] : fieldChoices(props.name)?.map(option => ({ ...option, label: t(option.label) })));
const parts = computed(() => dateParts(text.value));
const colorValid = computed(() => !text.value || CSS.supports('color', text.value));
const hexColor = computed(() => /^#[\da-f]{6}$/i.test(text.value) ? text.value : /^#[\da-f]{3}$/i.test(text.value) ? '#' + [...text.value.slice(1)].map(c => c + c).join('') : '#425aef');
const customSprite = computed(() => !!props.sprite && props.sprite !== '/img/icons/sprite.svg');
const emoji = computed(() => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.value)].find(item => /\p{Extended_Pictographic}/u.test(item.segment))?.segment || '');
function set(value: Json) { if (!props.disabled) emit('update:modelValue', value); }
function chooseEmoji(value: string | string[]) {
  const next = String(value);
  set(emoji.value ? text.value.replace(emoji.value, next) : `${next}${text.value ? ' ' + text.value : ''}`);
}
</script>
<template>
  <SelectionField v-if="choiceOptions" :model-value="modelValue" :name="name" :label="label" :options="choiceOptions" :disabled="disabled || (isPostReference(name) && (context?.loading.value || !!context?.error.value))" :hint="hint" @update:model-value="set" />
  <div v-else-if="control === 'date'" class="field date-field" :data-field="name"><span>{{ label }}</span><div class="date-inputs">
    <label class="field"><small>{{ t("日期") }}</small><input :name="name" :aria-label="t('{p0}日期', { p0: label })" type="date" :required="required" :value="parts?.date || ''" :disabled="disabled" @input="set(updateDate(text, 'date', ($event.target as HTMLInputElement).value))" /></label>
    <label class="field"><small>{{ t("时间（可选）") }}</small><input :name="`${name}-time`" :aria-label="t('{p0}时间', { p0: label })" type="time" step="0.001" :value="parts?.time.slice(0, 12) || ''" :disabled="disabled || !parts?.date" @input="set(updateDate(text, 'time', ($event.target as HTMLInputElement).value))" /></label>
  </div><small v-if="parts?.time && parts.time.length > 12" class="muted">{{ t("时间显示到毫秒；未修改时间时保留原有完整精度。") }}</small><small v-if="parts?.time" class="muted">{{ parts.zone ? t("时区：{p0}，修改时保留此时区", { p0: parts.zone === 'Z' ? 'UTC' : parts.zone }) : t("未指定时区，按站点原有规则处理") }}</small><small v-if="text && !parts" class="notice error">{{ t("无法识别日期“{value}”，请用日期选择器修改。", { value: text }) }}</small><small v-if="required" :class="text ? 'muted' : 'danger'">{{ t("此类内容需要填写发布时间。") }}</small><small v-else-if="name === 'date' || name === 'updated'" class="muted">{{ t("清空日期会移除该时间字段。") }}</small><small v-if="hint" class="muted">{{ hint }}</small></div>
  <div v-else-if="control === 'color'" class="field" :data-field="name"><label :for="`color-${name}`">{{ label }}</label><div class="color-inputs"><span class="color-swatch" :style="{ backgroundColor: colorValid ? text : 'transparent' }" :aria-label="t('颜色预览：{p0}', { p0: text || t('未设置') })" /><input type="color" :aria-label="t('选择{p0}', { p0: label })" :value="hexColor" :disabled="disabled" @input="set(($event.target as HTMLInputElement).value)" /><input :id="`color-${name}`" :name="name" :value="text" :disabled="disabled" placeholder="#425AEF" spellcheck="false" @input="set(($event.target as HTMLInputElement).value)" /></div><small v-if="!colorValid || (name.endsWith('_skin') && !/^#[\da-f]{6}$/i.test(text))" class="danger">{{ name.endsWith('_skin') ? t("主题色需要六位十六进制值，例如 #425AEF。") : t("颜色格式暂时无法预览。") }}</small><small v-else-if="text && !/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(text)" class="muted">{{ t("保留原颜色表达式；使用选择器后改为十六进制颜色。") }}</small><small v-if="hint" class="muted">{{ hint }}</small></div>
  <ImageField v-else-if="isImageField(name)" :model-value="text" :name="name" :label="label" :hint="hint" :preview="!backupImage" :mode="imageMode" :document-path="documentPath" :disabled="disabled" @update:model-value="set" />
  <div v-else-if="control === 'icon' || control === 'symbol'" class="field" :data-field="`${name}-preview`">
    <SelectionField v-if="!customSprite || control === 'icon'" :model-value="text" :options="[{ value: '', label: t('不显示图标') }, ...(control === 'icon' ? iconChoices : symbolChoices)]" :preview="control" :name="name" :label="label" :disabled="disabled" @update:model-value="set" />
    <label v-else class="field">{{ label }}<input :name="name" :value="text" :disabled="disabled" @input="set(($event.target as HTMLInputElement).value)" /><small class="muted">{{ t("自定义图标集：{sprite}。请输入图标标识。", { sprite: sprite || '' }) }}</small></label>
    <small v-if="control === 'icon' && text && !glyphs.has(text)" class="muted">{{ t("自定义图标值已保留，内置图标库暂无预览。") }}</small>
    <small v-if="control === 'symbol' && text && !customSprite && !symbolChoices.some(option => option.value === text)" class="muted">{{ t("已有图标标识已保留，内置图标库暂无预览。") }}</small>
    <small v-if="hint" class="muted">{{ hint }}</small>
  </div>
  <div v-else-if="control === 'emoji'" class="field"><label class="field">{{ label }}<input :name="name" :value="text" :disabled="disabled" @input="set(($event.target as HTMLInputElement).value)" /></label><div class="emoji-line"><ChoicePreview :value="emoji" kind="emoji" /><span>{{ text || t("添加一句个人介绍") }}</span></div><SelectionField :model-value="emoji" :options="emojiChoices" :name="`${name}-emoji`" :label="t('表情')" preview="emoji" :disabled="disabled" @update:model-value="chooseEmoji" /></div>
  <label v-else-if="kind === 'boolean' || typeof modelValue === 'boolean'" class="field checkbox-field"><input :name="name" type="checkbox" :checked="Boolean(modelValue)" :disabled="disabled" @change="set(($event.target as HTMLInputElement).checked)" /><span>{{ label }}<small v-if="hint" class="muted">{{ hint }}</small></span></label>
  <div v-else class="field"><label :for="`field-${name}`">{{ label }}</label>
    <textarea v-if="kind === 'textarea'" :id="`field-${name}`" :name="name" :value="text" :disabled="disabled" rows="4" @input="set(($event.target as HTMLTextAreaElement).value)" />
    <input v-else :id="`field-${name}`" :name="name" :type="kind === 'number' || typeof modelValue === 'number' ? 'number' : name.endsWith('email') ? 'email' : 'text'" :value="text" :disabled="disabled" :step="kind === 'number' || typeof modelValue === 'number' ? 'any' : undefined" @input="set(kind === 'number' || typeof modelValue === 'number' ? Number(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value)" />
    <SelectionField v-if="isLinkField(name) && context" :model-value="text" :options="context.links.value" :name="`${name}-site-link`" :label="t('选择站内页面')" :disabled="disabled || context.loading.value" :hint="t('可选择站内页面，也可直接填写外部链接。')" @update:model-value="set" />
    <details v-if="isLinkField(name) && context?.unresolved.value.length" class="advanced-field"><summary>{{ t("部分内容需要手动填写地址") }}</summary><p v-for="item in context.unresolved.value" :key="item">{{ item }}</p></details>
    <small v-if="hint" class="muted">{{ hint }}</small>
  </div>
</template>
