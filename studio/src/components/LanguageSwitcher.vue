<script setup lang="ts">
import { locale, setLocale, t } from '../i18n';
</script>
<template><label class="language-switcher"><span class="sr-only">{{ t('界面语言') }}</span><select :value="locale" :aria-label="t('界面语言')" @change="setLocale(($event.target as HTMLSelectElement).value)"><option value="en">English</option><option value="zh-CN">简体中文</option></select></label></template>
