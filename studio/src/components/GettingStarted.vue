<script setup lang="ts">
import { ref, watch } from 'vue';
import { t } from '../i18n';
import Icon from './Icon.vue';
const props = defineProps<{ identityKey: string; mode?: string; expanded?: boolean }>();
const emit = defineEmits<{ navigate: [view: string] }>();
const dismissed = ref(false);
const storageKey = () => `studio-guide:v1:${props.identityKey}`;
watch(() => props.identityKey, () => {
  try { dismissed.value = localStorage.getItem(storageKey()) === 'dismissed'; }
  catch { dismissed.value = false; }
}, { immediate: true });
function dismiss() {
  dismissed.value = true;
  try { localStorage.setItem(storageKey(), 'dismissed'); } catch { /* Dismiss for this visit if storage is unavailable. */ }
}
const steps = [
  { view: 'site', icon: 'globe', title: '确认站点信息', description: '设置站点名称、简介和正式网址；界面语言不会改变主站语言。' },
  { view: 'taxonomies', icon: 'tag', title: '准备标签与分类', description: '先维护名称，再在文章中选择；已有文章里的旧标签会保留。' },
  { view: 'media', icon: 'image', title: '准备写作图片', description: '上传图片或选择仓库已有图片。上传立即保存，选图后仍需保存表单。' },
  { view: 'article', icon: 'pen', title: '写下第一篇草稿', description: '创建文章，选择标签和分类，保存草稿；准备好后再设为已发布。' },
];
</script>
<template>
  <section v-if="expanded || !dismissed" class="card getting-started" :class="{ 'guide-page': expanded }" aria-labelledby="guide-title">
    <div class="guide-heading"><div><p class="eyebrow">{{ t('创作中心入门') }}</p><component :is="expanded ? 'h1' : 'h2'" id="guide-title">{{ expanded ? t('使用指南') : t('从这里开始') }}</component><p class="muted">{{ t('按需要完成这些步骤，随时可以开始写作。') }}</p></div><button v-if="!expanded" class="text-button" @click="dismiss">{{ t('收起入门指引') }}</button></div>
    <p v-if="mode" class="guide-connection"><span class="status-dot" />{{ mode === 'git' ? t('正在使用 Git 内容仓库。保存会提交到配置的分支。') : t('正在使用本地站点。保存会直接修改站点文件。') }}</p>
    <div class="guide-steps"><button v-for="(step, index) in steps" :key="step.view" class="guide-step" @click="emit('navigate', step.view)"><span class="guide-number">{{ index + 1 }}</span><span><strong>{{ t(step.title) }}</strong><small>{{ t(step.description) }}</small></span><Icon name="arrow" /></button></div>
    <div class="guide-publish"><strong>{{ t('保存之后，如何上线？') }}</strong><p>{{ mode === 'git' ? t('Git 保存成功后，到主站部署平台查看构建结果。后台不会自动为你创建发布流程。') : t('本地保存后，运行 Zola 预览或构建，再按你的部署流程发布主站。') }}</p><p>{{ t('「已发布」是文章状态，网站需要完成部署才能显示最新内容。') }}</p></div>
    <p v-if="!expanded" class="muted small">{{ t('关闭后可从左侧「使用指南」重新查看。') }}</p>
    <template v-else>
      <h2>{{ t('常见问题') }}</h2>
      <details><summary>{{ t('后台账号、Git token 和 OIDC 有什么区别？') }}</summary><p>{{ t('后台账号或 OIDC 用来登录；Git token 用来读取和提交内容仓库。它们分别配置，不能互相代替。密钥只放在服务端环境变量。') }}</p></details>
      <details><summary>{{ t('图片上传后为什么主站还看不到？') }}</summary><p>{{ t('上传只把文件保存到内容仓库。还需要在文章或表单中选用、保存，并完成主站部署。取消选图不会删除已经上传的文件。') }}</p></details>
      <details><summary>{{ t('友链图标为什么有两个地址？') }}</summary><p>{{ t('「本地图标」用于预览和选择图片；「备用图标地址」只保留地址，后台不会自动拉取。') }}</p></details>
      <details><summary>{{ t('保存冲突或登录过期怎么办？') }}</summary><p>{{ t('遇到保存冲突，先下载备份，再重新加载并合并修改。登录过期请重新登录；未保存的草稿不是已经提交到仓库的内容。') }}</p></details>
      <details><summary>{{ t('如何修改账号、仓库或启用 OIDC？') }}</summary><p>{{ t('修改服务端 .env 或部署平台环境变量，然后重启或重新部署。npm run setup 仅用于首次创建配置；npm run doctor 可以检查现有配置。详细说明在主题 studio/docs/setup.md。') }}</p></details>
      <details><summary>{{ t('页面正文和页面设置有什么区别？') }}</summary><p>{{ t('正文与属性管理当前页面；页面设置管理模板使用的配置。两者分别保存，同模板页面可能共用设置。') }}</p></details>
    </template>
  </section>
</template>
