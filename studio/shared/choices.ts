import type { ArticleSummary, Json } from './types.js';

export interface Choice { value: string; label: string }
export const stringValues = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

export function taxonomyChoices(dictionary: Json | undefined, used: string[]): Choice[] {
  const options = new Map<string, string>();
  if (Array.isArray(dictionary)) for (const item of dictionary) {
    if (typeof item === 'string' && item) options.set(item, item);
    else if (item && typeof item === 'object' && !Array.isArray(item) && typeof item.id === 'string' && item.id) {
      options.set(item.id, typeof item.name === 'string' && item.name ? item.name : item.id);
    }
  }
  for (const value of used) if (!options.has(value)) options.set(value, value);
  return [...options].map(([value, label]) => ({ value, label }));
}

export function collectionChoices(items: ArticleSummary[], chaptersOnly = false): Choice[] {
  const sections = items.filter(item => item.kind === 'collection' && !item.error && item.path.endsWith('/_index.md') && item.path !== 'content/collections/_index.md');
  const folder = (item: ArticleSummary) => item.path.slice('content/collections/'.length, -'/_index.md'.length);
  const titles = new Map(sections.map(item => [folder(item), item.title]));
  return sections.filter(item => !chaptersOnly || (item.template !== 'page/collection-list.html' && (item.template === 'page/collection-detail.html' || folder(item).includes('/'))))
    .map(item => {
      const value = folder(item), parts = value.split('/');
      return { value, label: parts.map((part, index) => titles.get(parts.slice(0, index + 1).join('/')) || part).join(' / ') };
    });
}
