import type { Json } from './types.js';
import { mergeDefaults, newItem } from './form-fields.js';

// Structural defaults expose editable fields even in sparse config files.
const structures: Record<string, Json> = {
  'extra.about.careers': { title: '', bg: '', tags: [] },
  'extra.about.textarea_left': { tittle: '', textarea_up: '', textarea_down: '' },
  'extra.about.textarea_right': { tittle: '', textarea_up: '', textarea_down: '' },
  'extra.about.like': { tips: '', title: '', bottom: '', bg: '' },
  'extra.about.music': { tips: '', title: '', link: '', bg: '' },
  'extra.about.map': { StrengthenTitle: '', background: '', backgroundDark: '', authorInfo: [] },
};
export function fillFieldDefaults(path: string, value: Json | undefined, fallback: Json): Json {
  const merged = mergeDefaults(value, structures[path] ?? fallback);
  if (Array.isArray(merged)) return merged.map((item, index) => fillFieldDefaults(`${path}.${index}`, item, newItem(path, '')));
  if (merged && typeof merged === 'object') return Object.fromEntries(Object.entries(merged).map(([key, item]) => [`${key}`, fillFieldDefaults(`${path}.${key}`, item, item)]));
  return merged;
}
