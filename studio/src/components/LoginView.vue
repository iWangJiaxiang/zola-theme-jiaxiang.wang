<script setup lang="ts">
import { t, type Message } from '../i18n';
import { onMounted, ref } from 'vue';
import { api, session, reauthentication, errorMessage } from '../api';
import Icon from './Icon.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';
const username = ref(''), password = ref(''), busy = ref(false), error = ref<Message>('');
const methods = ref<{ password: boolean; oidc: { label: string } | null } | null>(null);
async function loadMethods() {
  error.value = '';
  try { methods.value = await api('/auth/config'); }
  catch (e) { error.value = errorMessage(e); }
}
onMounted(async () => {
  await loadMethods();
  if (new URLSearchParams(location.search).has('login')) {
    error.value = new URLSearchParams(location.search).get('login') === 'denied' ? '此身份没有管理权限，请联系站点管理员。' : '统一身份登录未完成，请重新尝试。';
    history.replaceState(null, '', '/');
  }
});
async function login() {
  busy.value = true; error.value = '';
  try { session.value = await api('/auth/login', 'POST', { username: username.value, password: password.value }); reauthentication.value = false; password.value = ''; }
  catch (e) { error.value = errorMessage(e); }
  finally { busy.value = false; }
}
</script>
<template>
  <main class="login-page"><div class="login-language"><LanguageSwitcher /></div>
    <section class="login-intro">
      <div class="brand"><span class="brand-mark">W<span>·</span></span><div>Wonder Shine<small>{{ t("为创造者而生") }}</small></div></div>
      <div><p class="eyebrow">{{ t('你的创作空间') }}</p><h1>{{ t("让想法，") }}<br>{{ t("成为下一篇故事。") }}</h1><p class="login-description">{{ t("文章、专栏与站点设置，") }}<br>{{ t("都在你的创作中心。") }}</p></div>
      <div class="login-foot"><span class="status-dot"></span> {{ t("你的内容，你的站点。") }}</div>
    </section>
    <section class="login-panel card">
      <div class="login-symbol"><Icon name="pen" :size="28" /></div>
      <h2>{{ t("欢迎回来") }}</h2><p class="muted">{{ t("登录你的管理账号，继续创作。") }}</p>
      <p v-if="error" class="notice error" role="alert">{{ t(error) }} <button v-if="!methods" class="text-button" @click="loadMethods">{{ t("重试连接") }}</button></p>
      <form v-if="methods?.password" @submit.prevent="login">
        <label class="field">{{ t("账号") }}<input v-model="username" name="username" autocomplete="username" required autofocus :placeholder="t('管理员账号')" /></label>
        <label class="field">{{ t("密码") }}<input v-model="password" name="password" type="password" autocomplete="current-password" required :placeholder="t('输入密码')" /></label>
        <button class="primary wide" :disabled="busy">{{ busy ? t("正在登录…") : t("进入创作中心") }}<Icon name="arrow" /></button>
      </form>
      <template v-if="methods?.oidc"><div v-if="methods.password" class="divider">{{ t("或使用统一身份") }}</div><a class="button secondary wide" href="/api/auth/oidc/start"><Icon name="lock" />{{ methods.oidc.label === '统一身份登录' ? t('统一身份登录') : methods.oidc.label }}</a></template>
      <p v-if="!methods && !error" role="status">{{ t("正在连接管理中心…") }}</p>
      <details class="login-help"><summary>{{ t("首次使用或无法登录？") }}</summary><p>{{ t("使用 npm run setup 时设置的管理员账号和密码。这里没有公开注册入口，Git 账号不能直接用于登录。") }}</p><p>{{ t("忘记密码时，管理员可运行 npm run password 生成新哈希，更新服务端配置并重启。OIDC 用户请使用统一身份入口。") }}</p><p>{{ t("连接失败时运行 npm run doctor；完整步骤见 studio/docs/setup.md。") }}</p></details>
      <p class="login-note">{{ t("仅向站点管理员开放 · 内容仓库凭据由服务端保管") }}</p>
    </section>
  </main>
</template>
