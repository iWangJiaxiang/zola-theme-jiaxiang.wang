import type { Json } from './types.js';

// Mirrors the Zola safe/off routing rules. Avoid guessing transliteration or multilingual URLs.
export function contentLink(file: string, metadata: Record<string, Json>, config: Record<string, Json>): { publicPath?: string; linkWarning?: string } {
  const path = metadata.path;
  if (typeof path === 'string' && path) return { publicPath: '/' + path.replace(/^\/+|\/+$/g, '') + '/' };
  const slugify = config.slugify && typeof config.slugify === 'object' && !Array.isArray(config.slugify) ? config.slugify : {};
  const strategy = String(slugify.paths || 'on');
  const section = file.endsWith('/_index.md') || file === 'content/_index.md';
  const parts = file.replace(/^content\//, '').split('/');
  let stem = parts.pop()!.replace(/\.md$/, '');
  if (/\.[a-z]{2}(?:-[A-Za-z]+)?$/.test(stem) && config.languages) return { linkWarning: '多语言内容，请填写构建后的地址' };
  if (stem === 'index') stem = parts.pop() || '';
  else if (section) stem = '';
  if (!section && typeof metadata.slug === 'string' && metadata.slug) stem = metadata.slug;
  else if (!section && !slugify.paths_keep_dates) stem = stem.replace(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?[_-]/, '');
  const segments = [...parts, ...(stem ? stem.split('/') : [])];
  if (strategy === 'on' && segments.some(value => /[^\x00-\x7f]/.test(value))) return { linkWarning: '此路径需要转写，请填写构建后的地址' };
  const slug = (value: string) => strategy === 'safe' ? value.replace(/[<>:"/\\|?*]/g, '').replace(/\.+$/, '') : strategy === 'off' ? value : value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const route = segments.map(slug).filter(Boolean).join('/');
  return { publicPath: route ? '/' + route + '/' : '/' };
}
