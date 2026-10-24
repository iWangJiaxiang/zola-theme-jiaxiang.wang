<script setup lang="ts">
import { t } from '../i18n';
import { ref, computed, watch } from 'vue';
import { pageProfile } from '../../shared/page-settings';
import SettingsView from './SettingsView.vue';
const props = defineProps<{ template: string; body: string }>();
const emit = defineEmits<{ dirty: [value: boolean] }>();
const profile = computed(() => pageProfile(props.template, props.body));
const active = ref(''), dirty = ref(false);
watch(() => profile.value.groups.map(group => group.id).join(','), () => {
  if (!profile.value.groups.some(group => group.id === active.value)) active.value = profile.value.groups[0]?.id || '';
}, { immediate: true });
function updateDirty(value: boolean) { dirty.value = value; emit('dirty', value); }
</script>
<template>
  <section class="page-template-settings" :aria-label="t('页面专属设置')">
    <div class="template-intro"><h2>{{ t("{name}设置", { name: t(profile.label) }) }}</h2><p>{{ t(profile.description) }}</p><p v-if="profile.groups.length" class="muted small">{{ t("这些设置由使用同一模板的页面共享。页面正文与设置分别保存。") }}</p></div>
    <div v-if="profile.groups.length" class="template-settings-layout">
      <nav class="settings-group-tabs" :aria-label="t('页面配置分组')"><button v-for="group in profile.groups" :key="group.id" :class="{ active: active === group.id }" :disabled="dirty && active !== group.id" @click="active = group.id">{{ t(group.label) }}</button></nav>
      <p v-if="dirty" class="muted small">{{ t("请先保存当前设置，或通过「放弃更改并重新加载」丢弃修改，再切换配置分组。") }}</p>
      <SettingsView :key="active" :group="active" embedded @dirty="updateDirty" />
    </div>
  </section>
</template>
