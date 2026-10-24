<script setup lang="ts">
import LoadingState from './components/LoadingState.vue';
import { mediaUploading } from './media-store';
import { t, type Message } from './i18n';
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import type { Json, ArticleSummary } from '../shared/types';
import { api, session, reauthentication, errorMessage } from './api';
import LoginView from './components/LoginView.vue';
import SettingsView from './components/SettingsView.vue';
import ContentLibrary from './components/ContentLibrary.vue';
import DocumentEditor from './components/DocumentEditor.vue';
import Icon from './components/Icon.vue';
import MediaLibrary from './components/MediaLibrary.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import GettingStarted from './components/GettingStarted.vue';
import { collectionRoot, isLibraryItem, isSection, sortLibrary } from '../shared/library';
type Bootstrap = { site: Record<string, Json>; appearance: Record<string, Json>; mode: string; groups: { id: string; title: string }[] };
const editorView = ref<InstanceType<typeof DocumentEditor> | null>(null);
const checking = ref(true), data = ref<Bootstrap | null>(null), error = ref<Message>(''), view = ref('home'), dirty = ref(false), menuOpen = ref(false), dark = ref(false);
const articles = ref<ArticleSummary[]>([]), document = ref<{ path: string; initial?: Record<string, Json> } | null>(null);
const collectionFolder = ref(collectionRoot);
const loadingArticles = ref(false), articlesReady = ref(false), loadingSite = ref(false);
let generation = 0;
const libraryArticles = computed(() => sortLibrary(articles.value.filter(item => item.kind === 'article' && isLibraryItem(item)), 'article'));
function countContent(kind: string) { return articles.value.filter(item => item.kind === kind && isLibraryItem(item) && (kind !== 'collection' || isSection(item))).length; }
const navigation = [{ id: 'home', label: '工作台', icon: 'home' }, { id: 'article', label: '文章', icon: 'pen' }, { id: 'collection', label: '专栏与合集', icon: 'book' }, { id: 'page', label: '页面', icon: 'file' }, { id: 'media', label: '媒体库', icon: 'image' }, { id: 'help', label: '使用指南', icon: 'book' }];
const icons: Record<string, string> = { site: 'globe', navigation: 'menu', friends: 'link', about: 'user', taxonomies: 'tag', recommendations: 'star', appearance: 'palette' };
const contentKind = computed(() => ['article', 'page', 'collection'].includes(view.value) ? view.value as 'article' | 'page' | 'collection' : null);
const siteUrl = computed(() => { try { const url = new URL(String(data.value?.site.base_url)); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } });
function applyTheme() {
  const appearance = data.value?.appearance;
  window.document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
  const color = appearance?.[dark.value ? 'extra.style.theme_dark_skin' : 'extra.style.theme_light_skin'];
  if (typeof color === 'string' && /^#[a-f0-9]{6}$/i.test(color)) window.document.documentElement.style.setProperty('--wjx-theme', color);
  const font = appearance?.['extra.style.font_family'];
  if (typeof font === 'string') window.document.documentElement.style.fontFamily = `${font}, -apple-system, BlinkMacSystemFont, sans-serif`;
}
watch(dark, applyTheme);
async function bootstrap() {
  const current = generation;
  loadingSite.value = true;
  try {
    const result = await api<Bootstrap>('/bootstrap');
    if (current !== generation) return;
    data.value = result;
    const scheme = result.appearance['extra.style.color_scheme'];
    dark.value = scheme === 'dark' || (scheme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); applyTheme();
  } catch (e) { if (current === generation) error.value = errorMessage(e); }
  finally { if (current === generation) loadingSite.value = false; }
}
async function loadArticles(refresh = false) {
  const current = generation;
  loadingArticles.value = true;
  try { const result = await api<ArticleSummary[]>('/content' + (refresh ? '?refresh=1' : '')); if (current === generation) { articles.value = result; articlesReady.value = true; } }
  catch (e) { if (current === generation) error.value = errorMessage(e); }
  finally { if (current === generation) loadingArticles.value = false; }
}
async function reloadWorkspace() {
  if (loadingSite.value || loadingArticles.value) return;
  error.value = '';
  await Promise.all([loadArticles(true), bootstrap()]);
}
watch(session, async value => {
  generation++;
  if (value) { error.value = ''; await Promise.all([bootstrap(), loadArticles()]); }
  else { data.value = null; articles.value = []; articlesReady.value = false; loadingArticles.value = false; loadingSite.value = false; document.value = null; view.value = 'home'; dirty.value = false; error.value = ''; }
});
onMounted(async () => { try { session.value = await api('/auth/session'); } catch { /* Login is shown for an absent session. */ } finally { checking.value = false; } });
function leave() { if (mediaUploading.value) { alert(t('图片正在上传，请完成后再离开。')); return false; } editorView.value?.flush(); return !dirty.value || confirm(t('还有未保存的更改，确定离开吗？文章本地草稿会保留，配置表单不会自动保存。')); }
function navigate(next: string) { if (!leave()) return; document.value = null; dirty.value = false; view.value = next; menuOpen.value = false; if (next === 'home') void loadArticles(); }
function open(path: string, initial?: Record<string, Json>) { if (!leave()) return; document.value = { path, initial }; dirty.value = false; }
async function logout() { if (!leave()) return; try { await api('/auth/logout', 'POST'); reauthentication.value = false; session.value = null; } catch (e) { error.value = errorMessage(e); } }
function beforeUnload(event: BeforeUnloadEvent) { editorView.value?.flush(); if (dirty.value || mediaUploading.value) { event.preventDefault(); event.returnValue = ''; } }
window.addEventListener('beforeunload', beforeUnload); onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
</script>
<template>
  <LoadingState v-if="checking" label="正在打开创作中心…" />
  <LoginView v-else-if="!session" />
  <div v-else class="studio-shell" :inert="reauthentication">
    <button v-if="menuOpen" class="sidebar-backdrop" :aria-label="t('关闭导航')" @click="menuOpen = false" />
    <aside class="sidebar" :class="{ open: menuOpen }"><div class="brand"><span class="brand-mark">W<span>·</span></span><div>Wonder Shine<small>{{ t("创作中心") }}</small></div></div>
      <p class="nav-label">{{ t("创作空间") }}</p><nav :aria-label="t('内容导航')"><button v-for="item in navigation" :key="item.id" :class="{ active: view === item.id }" @click="navigate(item.id)"><Icon :name="item.icon" />{{ t(item.label) }}<span v-if="view === item.id" class="nav-indicator" /></button></nav>
      <p class="nav-label">{{ t("站点管理") }}</p><LoadingState v-if="loadingSite && !data" label="正在加载站点…" compact /><nav :aria-label="t('站点设置')"><button v-for="group in data?.groups" :key="group.id" :class="{ active: view === group.id }" @click="navigate(group.id)"><Icon :name="icons[group.id] || 'file'" />{{ t(group.title) }}</button></nav>
      <div class="sidebar-bottom"><span class="avatar">{{ session.identity.name.slice(0, 1).toUpperCase() }}</span><div><strong>{{ session.identity.name }}</strong><small>{{ session.identity.method === 'oidc' ? t("OIDC 管理员") : t("站点管理员") }}</small></div><button class="icon-button" :aria-label="t('退出登录')" @click="logout"><Icon name="logout" /></button></div>
    </aside>
    <div class="main-shell"><header class="topbar"><div class="row"><button class="icon-button mobile-menu" :aria-label="t('打开导航')" @click="menuOpen = !menuOpen"><Icon name="menu" /></button><span class="muted">{{ t("创作中心") }}</span><span class="breadcrumb">/</span><span>{{ document ? t("编辑内容") : view === 'home' ? t("工作台") : t(navigation.find(n => n.id === view)?.label || data?.groups.find(g => g.id === view)?.title) }}</span></div><div class="row topbar-actions"><LanguageSwitcher /><span v-if="data" class="connection"><span class="status-dot"></span>{{ data?.mode === 'git' ? t("Git 内容仓库") : t("本地站点") }}</span><button class="icon-button" :aria-label="t('切换明暗模式')" @click="dark = !dark"><Icon :name="dark ? 'sun' : 'moon'" /></button><a v-if="siteUrl" :href="siteUrl" target="_blank" rel="noopener noreferrer" class="visit-site">{{ t("访问主站 ↗") }}</a></div></header>
      <main class="main-content"><p v-if="error" class="notice error" role="alert">{{ t(error) }} <button class="text-button" :disabled="loadingSite || loadingArticles" @click="reloadWorkspace">{{ t("重试连接") }}</button></p>
        <DocumentEditor ref="editorView" v-if="document" :key="document.path" :path="document.path" :initial="document.initial" @dirty="dirty = $event" @back="navigate(view)" />
        <template v-else-if="view === 'home'"><div class="page-heading"><div><p class="eyebrow">{{ t('创作工作台') }}</p><h1>{{ t("今天，写点什么？") }}</h1><p class="muted">{{ t("欢迎回来，{name}。开始记录新的想法吧。", { name: session.identity.name }) }}</p></div><button class="primary" @click="navigate('article')"><Icon name="plus" />{{ t("开始创作") }}</button></div>
          <GettingStarted v-if="data" :identity-key="`${session.identity.method}:${session.identity.id}`" :mode="data.mode" @navigate="navigate" />
          <div class="welcome-card"><div><span class="badge">{{ data?.site.title || t("我的站点") }}</span><h2>{{ t("内容有自己的光。") }}</h2><p>{{ t("专注写作，轻松打理你的数字花园。") }}</p><button class="hero-link" @click="navigate('article')">{{ t("打开内容库") }} <Icon name="arrow" /></button></div><div class="hero-art" aria-hidden="true"><div class="paper"><span /><span /><span /><Icon name="pen" :size="60" /></div><span class="spark">✦</span></div></div>
          <div class="stats-grid"><button v-for="item in [{ name: t('文章'), kind: 'article', icon: 'pen' }, { name: t('专栏与合集'), kind: 'collection', icon: 'book' }, { name: t('页面'), kind: 'page', icon: 'file' }]" :key="item.kind" class="card stat-card" @click="navigate(item.kind)"><span class="stat-icon"><Icon :name="item.icon" /></span><div><span class="muted">{{ item.name }}</span><strong>{{ articlesReady ? countContent(item.kind) : '—' }}</strong></div><Icon name="arrow" /></button></div>
          <div class="home-grid"><section class="card"><div class="card-heading"><h2>{{ t("继续创作") }}</h2><button class="text-button" @click="navigate('article')">{{ t("全部文章 →") }}</button></div><LoadingState v-if="loadingArticles" label="正在读取内容…" /><div v-else-if="articlesReady && !articles.length" class="empty-state muted">{{ t("创建第一篇文章，开始记录。") }}</div><button v-for="item in libraryArticles.slice(0, 5)" :key="item.path" class="content-row" @click="view = 'article'; open(item.path)"><span class="content-icon"><Icon name="file" /></span><span class="content-info"><strong>{{ item.title }}</strong><small>{{ item.tags.join(' · ') || t("等待下一次灵感") }}</small></span><span class="badge" :class="{ draft: item.draft, invalid: item.error }">{{ item.error ? t("需要检查") : item.render === false ? t("仅作分组") : item.draft ? t("草稿") : t("已发布") }}</span></button></section>
            <section class="card quick-links"><h2>{{ t("打理你的站点") }}</h2><p class="muted">{{ t("常用设置，一步直达。") }}</p><button v-for="item in [{ id: 'site', name: t('站点信息'), icon: 'globe' }, { id: 'navigation', name: t('导航菜单'), icon: 'menu' }, { id: 'friends', name: t('友链管理'), icon: 'link' }, { id: 'appearance', name: t('外观样式'), icon: 'palette' }]" :key="item.id" @click="navigate(item.id)"><Icon :name="item.icon" />{{ item.name }}<Icon name="arrow" /></button></section></div>
          <p class="muted small workspace-note">{{ t("已发布的内容会在下次网站部署后上线。") }}</p>
        </template>
        <ContentLibrary v-else-if="contentKind" :key="view" :kind="contentKind" :folder="collectionFolder" @browse="collectionFolder = $event" @open="open" @create="open" />
        <MediaLibrary v-else-if="view === 'media'" />
        <GettingStarted v-else-if="view === 'help'" expanded :identity-key="`${session.identity.method}:${session.identity.id}`" :mode="data?.mode" @navigate="navigate" />
        <SettingsView v-else :key="view" :group="view" @dirty="dirty = $event" @saved="bootstrap" />
      </main><footer class="studio-footer">{{ t("Wonder Shine · 创作中心") }} <span>{{ t("写作与生活，都值得用心记录。") }}</span></footer>
    </div>
  </div>
  <div v-if="reauthentication && session" class="reauth-backdrop" role="dialog" aria-modal="true" :aria-label="t('重新登录')"><p class="reauth-note">{{ t("登录已过期，请重新登录。当前编辑内容已保留。") }}</p><LoginView /></div>
</template>
