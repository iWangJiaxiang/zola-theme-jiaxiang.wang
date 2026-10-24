import type { ArticleSummary } from './types.js';

export const collectionRoot = 'content/collections/_index.md';
export const isSection = (item: ArticleSummary) => item.path.endsWith('/_index.md');
export const isLibraryItem = (item: ArticleSummary) => item.kind === 'collection' ? item.path !== collectionRoot : !isSection(item);
export const sectionDirectory = (path: string) => path.slice(0, -'_index.md'.length);

export function contentLabel(item: ArticleSummary): string {
  if (item.kind === 'collection') return !isSection(item) ? '章节' : item.render === false ? '目录分组' : item.template === 'page/collection-list.html' ? '专栏' : '合集';
  return item.kind === 'article' ? '文章' : '页面';
}

export function displayTitle(item: ArticleSummary): string {
  const fallbackTitle = item.path.split('/').slice(-2).join('/');
  if (item.title.trim() && item.title !== item.path && !(isSection(item) && item.title === fallbackTitle)) return item.title;
  if (item.path === collectionRoot) return '合集首页';
  const parts = item.path.split('/');
  return ['index.md', '_index.md'].includes(parts.at(-1)!) ? parts.at(-2)! : parts.at(-1)!.replace(/\.md$/, '');
}

export function parentSection(item: ArticleSummary, items: ArticleSummary[]): string {
  return items.filter(candidate => candidate.kind === 'collection' && isSection(candidate) && candidate.path !== item.path && item.path.startsWith(sectionDirectory(candidate.path)))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || collectionRoot;
}

export function sectionTrail(path: string, items: ArticleSummary[]): ArticleSummary[] {
  return items.filter(item => item.kind === 'collection' && isSection(item) && item.path !== collectionRoot && (item.path === path || path.startsWith(sectionDirectory(item.path))))
    .sort((a, b) => a.path.length - b.path.length);
}

export function sortLibrary(items: ArticleSummary[], kind: ArticleSummary['kind']): ArticleSummary[] {
  return [...items].sort((a, b) => {
    if (kind === 'collection') return Number(isSection(b)) - Number(isSection(a)) || (a.weight || 0) - (b.weight || 0) || displayTitle(a).localeCompare(displayTitle(b), 'zh-CN', { numeric: true });
    if (kind === 'article' && a.date !== b.date) return b.date.localeCompare(a.date);
    return displayTitle(a).localeCompare(displayTitle(b), 'zh-CN', { numeric: true });
  });
}
