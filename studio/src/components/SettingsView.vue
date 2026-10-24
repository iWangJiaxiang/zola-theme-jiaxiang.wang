<script setup lang="ts">
import LoadingState from './LoadingState.vue';
import { t, type Message } from '../i18n';
import { ref, shallowRef, computed, watch, onBeforeUnmount, provide } from 'vue';
import type { Settings, Json, SaveResult, ArticleSummary } from '../../shared/types';
import { api, session, errorMessage } from '../api';
import ValueEditor from './ValueEditor.vue';
import FormField from './FormField.vue';
import { formContext } from '../form-context';
import type { Choice } from '../../shared/choices';
const props = defineProps<{ group: string; embedded?: boolean }>();
const emit = defineEmits<{ dirty: [value: boolean]; saved: [] }>();
const settings = shallowRef<Settings | null>(null), values = ref<Record<string, Json>>({}), baseline = ref<Record<string, Json>>({});
const unresolvedItems = ref<ArticleSummary[]>([]);
const unresolved = computed(() => unresolvedItems.value.map(item => `${item.title}: ${t(item.linkWarning)}`));
const posts = ref<Choice[]>([]), links = ref<Choice[]>([]), relationsLoading = ref(false), relationsError = ref<Message>('');
const siteLinks = computed(() => [{ value: '/', label: t('首页') }, ...links.value.filter(item => item.value !== '/')]);
provide(formContext, { unresolved, posts, links: siteLinks, values, loading: relationsLoading, error: relationsError });
async function loadRelations() {
  relationsLoading.value = true; relationsError.value = '';
  try {
    const items = await api<ArticleSummary[]>('/content');
    unresolvedItems.value = items.filter(item => item.linkWarning);
    posts.value = items.filter(item => !item.error && item.kind !== 'page' && !item.path.endsWith('/_index.md')).map(item => ({ value: item.path.replace(/^content\//, ''), label: `${item.title} · ${item.path.replace(/^content\//, '')}` }));
    links.value = [...items.filter(item => !item.error && item.publicPath && item.render !== false).map(item => ({ value: item.publicPath!, label: item.title }))].filter((item, index, all) => all.findIndex(other => other.value === item.value) === index);
  } catch (e) { relationsError.value = errorMessage(e); }
  finally { relationsLoading.value = false; }
}
void loadRelations();
const ready = ref(false);
const storageKey = `studio-settings:${session.value?.identity.method}:${session.value?.identity.id}:${props.group}`;
const busy = ref(false), error = ref<Message>(''), message = ref<Message>('');
const changes = computed(() => Object.fromEntries(Object.entries(values.value).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(baseline.value[key]))));
const dirty = computed(() => Object.keys(changes.value).length > 0);
watch(dirty, value => emit('dirty', value), { flush: 'sync' });
watch([values, baseline, () => settings.value?.revision], () => {
  if (!ready.value || !settings.value) return;
  try {
    if (dirty.value) sessionStorage.setItem(storageKey, JSON.stringify({ values: values.value, baseline: baseline.value, revision: settings.value.revision }));
    else sessionStorage.removeItem(storageKey);
  } catch { /* The mounted form remains available when tab storage is disabled. */ }
}, { deep: true });
let requestId = 0;
async function load() {
  const id = ++requestId; ready.value = false;
  error.value = ''; settings.value = null; message.value = '';
  try {
    const result = await api<Settings>(`/settings/${props.group}`);
    if (id !== requestId) return;
    settings.value = result; values.value = structuredClone(result.values); baseline.value = structuredClone(result.values);
    try {
      const draft = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (draft?.values && draft?.baseline && typeof draft.revision === 'string') {
        values.value = draft.values; baseline.value = draft.baseline; settings.value.revision = draft.revision;
        message.value = '已恢复当前标签页中的配置草稿；保存时仍会检查仓库版本。';
      }
    } catch { /* Invalid or unavailable tab storage does not block loading. */ }
    ready.value = true;
  } catch (e) { if (id === requestId) error.value = errorMessage(e); }
}
watch(() => props.group, load, { immediate: true });
onBeforeUnmount(() => { requestId++; emit('dirty', false); });
function reload() { if (!dirty.value || window.confirm(t('重新加载会丢弃当前未保存修改，继续吗？'))) { ready.value = false; try { sessionStorage.removeItem(storageKey); } catch {} void load(); } }
async function save() {
  if (!settings.value) return;
  busy.value = true; error.value = ''; message.value = '';
  const submitted = JSON.parse(JSON.stringify(values.value));
  try {
    const result = await api<SaveResult>(`/settings/${props.group}`, 'PUT', { revision: settings.value.revision, changes: changes.value });
    settings.value.revision = result.revision; baseline.value = submitted; message.value = result.message; emit('saved');
  } catch (e) { error.value = errorMessage(e); }
  finally { busy.value = false; }
}
</script>
<template>
  <section v-if="settings" class="settings-page" :class="{ 'embedded-settings': embedded }">
    <div class="page-heading"><div><p v-if="!embedded" class="eyebrow">{{ t("站点管理") }}</p><component :is="embedded ? 'h3' : 'h1'">{{ t(settings.title) }}</component><p class="muted">{{ t(settings.description) }}</p></div><button class="primary" :disabled="busy || !dirty" @click="save">{{ busy ? t("正在保存…") : embedded ? t("保存页面设置") : t("保存更改") }}</button></div>
    <p v-if="error" class="notice error" role="alert">{{ t(error) }} <button class="text-button" @click="reload">{{ t("重新加载") }}</button></p>
    <p v-if="message" class="notice success" role="status">{{ t(message) }}</p>
    <button v-if="dirty" class="text-button settings-discard" @click="reload">{{ t("放弃更改并重新加载") }}</button>
    <div class="card settings-card"><div class="card-heading"><h2>{{ t("配置内容") }}</h2><span class="muted small">{{ dirty ? t("有未保存的更改") : t("已保存") }}</span></div>
      <p v-if="relationsError" class="notice error">{{ t("无法加载可选内容：") }}{{ t(relationsError) }} <button class="text-button" @click="loadRelations">{{ t("重试选项") }}</button></p>
      <div class="settings-grid"><template v-for="field in settings.fields" :key="field.path">
        <div v-if="field.kind === 'structured'" class="full-width"><ValueEditor v-model="values[field.path]" :name="field.path" :label="t(field.label)" :sprite="String(values['skill.svg_sprite'] || '')" /></div>
        <FormField v-else v-model="values[field.path]" :class="{ 'full-width': field.kind === 'textarea' }" :name="field.path" :label="t(field.label)" :kind="field.kind" :hint="t(field.hint)" />
      </template></div>
    </div>
    <p class="muted small">{{ t("仅修改对应字段，保留其他配置。列表内容发生修改时会重新排版该列表。") }}</p>
  </section>
  <p v-else-if="error" class="notice error" role="alert">{{ t(error) }} <button @click="load">{{ t("重试") }}</button></p>
  <LoadingState v-else label="正在读取配置…" />
</template>
