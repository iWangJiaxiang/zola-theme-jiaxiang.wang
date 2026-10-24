import { english, chinese } from './messages.js';
export type Locale = 'en' | 'zh-CN';
export type MessageParams = Record<string, string | number>;
export type Message = string | { key: string; params?: MessageParams };
export const defaultLocale: Locale = 'en';
export const localeStorageKey = 'studio-language';
export function resolveLocale(languages: readonly string[] = []): Locale {
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh-CN';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return defaultLocale;
}
export function initialLocale(saved: string | null, languages: readonly string[]): Locale {
  return saved === 'en' || saved === 'zh-CN' ? saved : resolveLocale(languages);
}
export function translate(message: Message | undefined, locale: Locale, params: MessageParams = {}): string {
  if (!message) return '';
  const key = typeof message === 'string' ? message : message.key;
  const values = typeof message === 'string' ? params : message.params || {};
  const catalog = locale === 'zh-CN' ? chinese : english;
  const source = Object.hasOwn(catalog, key) ? catalog[key] : key;
  return source.replace(/\{(\w+)\}/g, (token, name: string) => Object.hasOwn(values, name) ? String(values[name]) : token);
}
