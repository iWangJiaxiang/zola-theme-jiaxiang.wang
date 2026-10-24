<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { t } from '../i18n';
withDefaults(defineProps<{ label: string; compact?: boolean }>(), { compact: false });
const slow = ref(false);
const timer = setTimeout(() => { slow.value = true; }, 8_000);
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <div class="loading-panel" :class="{ compact }">
    <div class="loading-caption" role="status" aria-live="polite">
      <span class="loading-spinner" aria-hidden="true" />
      <div><strong>{{ t(label) }}</strong><p>{{ t(slow ? '加载比平时久一些，仍在等待服务器响应。' : '首次打开可能需要稍等片刻。') }}</p></div>
    </div>
    <div v-if="!compact" class="loading-skeleton" aria-hidden="true">
      <div v-for="row in 3" :key="row" class="skeleton-row"><span class="skeleton-icon" /><div><span class="skeleton-line" /><span class="skeleton-line short" /></div></div>
    </div>
  </div>
</template>
<style scoped>
.loading-panel { padding: 28px; min-width: 0; }
.loading-caption { display: flex; align-items: center; gap: 14px; color: var(--studio-muted); }
.loading-caption strong { font-size: 14px; font-weight: 500; color: var(--wjx-fontcolor); }
.loading-caption p { margin: 6px 0 0; font-size: 12px; line-height: 1.6; }
.loading-spinner { width: 20px; height: 20px; flex: 0 0 20px; border: 2px solid var(--studio-line); border-top-color: var(--wjx-theme); border-radius: 50%; animation: studio-spin 1s linear infinite; }
.loading-skeleton { display: grid; gap: 22px; margin-top: 28px; }
.skeleton-row { display: flex; align-items: center; gap: 14px; }
.skeleton-row > div { flex: 1; display: grid; gap: 10px; }
.skeleton-icon, .skeleton-line { display: block; background: var(--studio-line); border-radius: 6px; animation: studio-pulse 1.8s ease-in-out infinite; }
.skeleton-icon { width: 38px; height: 38px; flex-shrink: 0; }
.skeleton-line { height: 12px; width: 66%; max-width: 440px; }
.skeleton-line.short { width: 38%; height: 9px; }
.skeleton-row:nth-child(2) .skeleton-line { animation-delay: .15s; }
.skeleton-row:nth-child(3) .skeleton-line { animation-delay: .3s; }
.compact { padding: 18px 0; }
@keyframes studio-spin { to { transform: rotate(360deg); } }
@keyframes studio-pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .loading-spinner, .skeleton-icon, .skeleton-line { animation: none; } }
@media (max-width: 600px) { .loading-panel:not(.compact) { padding: 20px 16px; } }
</style>
