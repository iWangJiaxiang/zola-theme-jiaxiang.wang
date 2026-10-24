import { parse } from 'smol-toml';
import { parseForESLint, type AST } from 'toml-eslint-parser';
import { isDeepStrictEqual } from 'node:util';

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function segments(path: string): string[] {
  const parts = path.split('.');
  if (parts.some(p => !/^[\w-]+$/.test(p) || forbidden.has(p))) throw new Error('不支持的配置路径');
  return parts;
}
export function getValue(object: unknown, path: string): unknown {
  return segments(path).reduce<unknown>((value, key) => value && typeof value === 'object'
    && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined, object);
}
function inline(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (value && typeof value === 'object') return `{ ${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)} = ${inline(v)}`).join(', ')} }`;
  throw new Error('配置值只能包含文本、数字、布尔值、列表或对象');
}
const keyPath = (key: AST.TOMLKey) => key.keys.map(k => k.type === 'TOMLBare' ? k.name : k.value).join('.');

/** Patch syntax ranges, never serialize the whole source document. */
export function patchToml(source: string, changes: Record<string, unknown>): string {
  const paths = Object.keys(changes);
  for (const path of paths) {
    segments(path);
    if (paths.some(other => other !== path && other.startsWith(`${path}.`))) throw new Error('配置路径重叠');
  }
  let result = source;
  for (const [path, value] of Object.entries(changes)) {
    const data = parse(result);
    if (isDeepStrictEqual(JSON.parse(JSON.stringify(getValue(data, path) ?? null)), JSON.parse(JSON.stringify(value)))) continue;
    const nodes = parseForESLint(result).ast.body[0].body;
    const entries: { path: string; node: AST.TOMLKeyValue }[] = [];
    for (const node of nodes) {
      if (node.type === 'TOMLKeyValue') entries.push({ path: keyPath(node.key), node });
      else if (node.kind === 'standard' && !node.resolvedKey.some(k => typeof k === 'number')) {
        for (const item of node.body) entries.push({ path: `${node.resolvedKey.join('.')}.${keyPath(item.key)}`, node: item });
      }
    }
    const entry = entries.find(e => e.path === path);
    if (entry) {
      const [start, end] = entry.node.value.range;
      result = result.slice(0, start) + inline(value) + result.slice(end);
      continue;
    }
    const ancestor = entries.find(e => path.startsWith(`${e.path}.`) && e.node.value.type === 'TOMLInlineTable');
    if (ancestor) {
      const current = structuredClone(getValue(data, ancestor.path)) as Record<string, unknown>;
      const tail = path.slice(ancestor.path.length + 1).split('.');
      let cursor = current;
      for (const part of tail.slice(0, -1)) {
        if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
        cursor = cursor[part] as Record<string, unknown>;
      }
      cursor[tail.at(-1)!] = value;
      result = patchToml(result, { [ancestor.path]: current });
      continue;
    }
    const tables = nodes.filter((node): node is AST.TOMLTable => node.type === 'TOMLTable');
    const owned = tables.filter(node => {
      const name = keyPath(node.key);
      return name === path || name.startsWith(`${path}.`);
    });
    if (owned.length) {
      for (const node of [...owned].sort((a, b) => b.range[0] - a.range[0])) {
        result = result.slice(0, node.range[0]) + result.slice(node.range[1]);
      }
      result = patchToml(result, { [path]: value });
      continue;
    }
    const parent = tables.filter(t => t.kind === 'standard' && path.startsWith(`${keyPath(t.key)}.`))
      .sort((a, b) => keyPath(b.key).length - keyPath(a.key).length)[0];
    const lineEnd = parent ? result.indexOf('\n', parent.range[1]) : -1;
    const position = parent ? (lineEnd === -1 ? result.length : lineEnd + 1) : (tables[0]?.range[0] ?? result.length);
    const relative = parent ? path.slice(keyPath(parent.key).length + 1) : path;
    result = result.slice(0, position) + '\n' + `${relative} = ${inline(value)}` + '\n' + result.slice(position);
  }
  parse(result);
  return result;
}

export function splitDocument(source: string): { header: string; body: string; start: number; end: number } {
  const opening = /^\uFEFF?\+\+\+[ \t]*\r?\n/.exec(source);
  if (!opening) throw new Error('文章需要使用 +++ 包裹 TOML 元数据');
  const delimiters = /^\+\+\+[ \t]*(?:\r?\n|$)/gm;
  delimiters.lastIndex = opening[0].length;
  for (let match = delimiters.exec(source); match; match = delimiters.exec(source)) {
    const header = source.slice(opening[0].length, match.index);
    try { parse(header); } catch { continue; }
    return { header, body: source.slice(delimiters.lastIndex), start: opening[0].length, end: match.index };
  }
  throw new Error('文章 TOML 元数据格式不正确');
}
export function updateDocument(source: string, changes: Record<string, unknown>, body: string): string {
  const doc = splitDocument(source);
  const delimiterEnd = source.length - doc.body.length;
  let header = doc.header;
  const clearedDates = Object.keys(changes).filter(key => ['date', 'updated'].includes(key) && changes[key] === '');
  if (clearedDates.length) {
    const entries = parseForESLint(header).ast.body[0].body.filter(node => node.type === 'TOMLKeyValue' && clearedDates.includes(keyPath(node.key)));
    for (const node of entries.sort((a, b) => b.range[0] - a.range[0])) header = header.slice(0, node.range[0]) + header.slice(node.range[1]);
  }
  return source.slice(0, doc.start) + patchToml(header, Object.fromEntries(Object.entries(changes).filter(([key]) => !clearedDates.includes(key)))) + source.slice(doc.end, delimiterEnd) + body;
}

/** Expose calendar values exactly as authored, including offsets and sub-millisecond precision. */
export function formDocumentMetadata(source: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = parse(source);
  for (const node of parseForESLint(source).ast.body[0].body) {
    if (node.type !== 'TOMLKeyValue' || !['date', 'updated'].includes(keyPath(node.key))) continue;
    const value = node.value;
    if (value.type === 'TOMLValue' && ['offset-date-time', 'local-date-time', 'local-date'].includes(value.kind)) metadata[keyPath(node.key)] = source.slice(...value.range);
  }
  return metadata;
}
