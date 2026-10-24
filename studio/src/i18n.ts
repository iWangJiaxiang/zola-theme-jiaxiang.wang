import { ref, watch } from 'vue';
import { initialLocale, localeStorageKey, translate, type Locale, type Message, type MessageParams } from '../shared/i18n';
export type { Message } from '../shared/i18n';
function detect(): Locale {
  let saved: string | null = null;
  try { saved = localStorage.getItem(localeStorageKey); } catch { /* Storage is optional. */ }
  return initialLocale(saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
}
export const locale = ref<Locale>(detect());
export const t = (message: Message | undefined, params?: MessageParams) => translate(message, locale.value, params);
export const translateOptions = <T extends { label: string }>(options: T[]) => options.map(option => ({ ...option, label: t(option.label) }));
export function setLocale(value: string) { if (value === 'en' || value === 'zh-CN') locale.value = value; }
watch(locale, value => {
  document.documentElement.lang = value;
  document.title = `${t('创作中心')} · Wonder Shine`;
  try { localStorage.setItem(localeStorageKey, value); } catch { /* The current session can still switch language. */ }
}, { immediate: true, flush: 'sync' });
