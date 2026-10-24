import { posix } from 'node:path';
import { parse } from 'smol-toml';
import type { Article, ArticleSummary, Json, Settings, Field } from '../shared/types.js';
import { settingsSchemas, documentFields } from '../shared/settings.js';
import { getValue, patchToml, splitDocument, updateDocument, formDocumentMetadata } from './content.js';
import { type Repository, validatePath } from './repository.js';
import { StudioError } from './errors.js';
import { stringValues } from '../shared/choices.js';
import { dateParts } from '../shared/form-fields.js';
import { contentLink } from '../shared/content-links.js';
import { fillFieldDefaults } from '../shared/form-defaults.js';
import { pageSettingsSchemas } from '../shared/page-settings.js';

const allSettingsSchemas = [...settingsSchemas, ...pageSettingsSchemas];

export const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
function validateChanges(changes: unknown, fields: Field[]): asserts changes is Record<string, Json> {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new StudioError(400, '修改内容必须是字段对象');
  for (const [path, value] of Object.entries(changes)) {
    const field = fields.find(f => f.path === path);
    if (!field) throw new StudioError(400, '不允许修改字段：{path}', { path });
    const valid = field.kind === 'structured' ? Array.isArray(field.default) ? Array.isArray(value) : value !== null && typeof value === 'object' && !Array.isArray(value)
      : field.kind === 'boolean' ? typeof value === 'boolean' : field.kind === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'string';
    if (!valid) throw new StudioError(400, '字段“{path}”的格式不正确', { path });
    if (path.endsWith('_skin') && !/^#[\da-fA-F]{6}$/.test(String(value))) throw new StudioError(400, '主题色需要使用六位十六进制颜色');
    if (path.endsWith('color_scheme') && !['system', 'dark', 'light'].includes(String(value))) throw new StudioError(400, '颜色模式应为 system、light 或 dark');
    if ((path === 'date' || path === 'updated') && value !== '' && !dateParts(String(value))) throw new StudioError(400, '请选择有效的日期和时间');
  }
}
function documentPath(path: string) { validatePath(path); if (!path.startsWith('content/')) throw new StudioError(400, '请选择文章或页面路径'); }
export class ContentService {
  constructor(private repository: Repository) {}
  async settings(id: string): Promise<Settings> {
    const schema = allSettingsSchemas.find(s => s.id === id);
    if (!schema) throw new StudioError(404, '未找到配置分组');
    const file = await this.repository.read(schema.file);
    const data = file ? schema.file.endsWith('.json') ? JSON.parse(file.text) : parse(file.text) : {};
    const values = Object.fromEntries(schema.fields.map(field => [field.path, fillFieldDefaults(field.path, asJson(getValue(data, field.path) ?? field.default), field.default)]));
    return { ...schema, values, revision: file?.revision ?? '' };
  }
  async saveSettings(id: string, changes: unknown, revision: string | null) {
    const schema = allSettingsSchemas.find(s => s.id === id);
    if (!schema) throw new StudioError(404, '未找到配置分组');
    validateChanges(changes, schema.fields);
    const file = await this.repository.read(schema.file);
    if ((file?.revision ?? null) !== (revision || null)) throw new StudioError(409, '文件已更新，请重新加载并合并修改');
    const text = schema.file.endsWith('.json') ? JSON.stringify({ ...(file ? JSON.parse(file.text) : {}), ...changes }, null, 2) + '\n'
      : patchToml(file?.text ?? '', changes);
    return this.repository.write(schema.file, text, revision || null);
  }
  async list(): Promise<ArticleSummary[]> {
    const [files, configFile] = await Promise.all([this.repository.list(), this.repository.read('config.toml')]);
    const config = configFile ? asJson(parse(configFile.text)) as Record<string, Json> : {};
    return files.map(file => {
      const kind = file.path.startsWith('content/articles/') ? 'article' : file.path.startsWith('content/pages/') ? 'page' : 'collection';
      try {
        const metadata = parse(splitDocument(file.text).header);
        return { path: file.path, title: String(metadata.title || file.path.split('/').slice(-2).join('/')), date: metadata.date instanceof Date ? metadata.date.toISOString() : typeof metadata.date === 'string' ? metadata.date : '',
          draft: metadata.draft === true, kind, tags: stringValues(getValue(metadata, 'taxonomies.tags')), categories: stringValues(getValue(metadata, 'taxonomies.categories')),
          displayTags: stringValues(getValue(metadata, 'extra.tags')), template: typeof metadata.template === 'string' ? metadata.template : undefined,
          ...contentLink(file.path, asJson(metadata) as Record<string, Json>, config),
          description: typeof metadata.description === 'string' ? metadata.description : '', render: metadata.render !== false,
          weight: typeof metadata.weight === 'number' ? metadata.weight : 0 } satisfies ArticleSummary;
      } catch {
        return { path: file.path, title: file.path, date: '', draft: false, kind, tags: [], categories: [], error: 'TOML 格式需要检查' } satisfies ArticleSummary;
      }
    });
  }
  async document(path: string): Promise<Article> {
    documentPath(path);
    const file = await this.repository.read(path);
    if (!file) throw new StudioError(404, '未找到文章');
    const doc = splitDocument(file.text);
    return { ...file, body: doc.body, metadata: asJson(formDocumentMetadata(doc.header)) as Record<string, Json> };
  }
  async saveDocument(path: string, changes: unknown, body: string, revision: string | null) {
    documentPath(path); validateChanges(changes, documentFields);
    if (typeof body !== 'string') throw new StudioError(400, '正文必须是文本');
    const current = await this.repository.read(path);
    if ((current?.revision ?? null) !== (revision || null)) throw new StudioError(409, '文件已更新，请重新加载并合并修改');
    if (!current && path.startsWith('content/collections/') && path !== 'content/collections/_index.md') {
      const parent = path.endsWith('/index.md') || path.endsWith('/_index.md') ? posix.dirname(posix.dirname(path)) : posix.dirname(path);
      if (!await this.repository.read(`${parent}/_index.md`)) throw new StudioError(400, '请先创建上级专栏或合集');
    }
    const isSection = path.endsWith('/_index.md');
    const defaults = { draft: true, ...(path.startsWith('content/pages/') ? { template: 'page/empty.html', 'extra.type': 'page' } : {}), ...(isSection && path.startsWith('content/collections/') ? { 'extra.cover': '/img/default-cover.webp', 'extra.tags': [] } : {}), ...(isSection ? {} : { date: new Date().toISOString().slice(0, 10), 'taxonomies.tags': [], 'taxonomies.categories': [] }) };
    const base = current?.text ?? `+++\n${patchToml('', defaults)}+++\n`;
    const text = updateDocument(base, changes, body);
    const metadata = parse(splitDocument(text).header);
    const needsDate = (!isSection && !path.startsWith('content/pages/')) || ['page/post.html', 'page/collection-content.html'].includes(String(metadata.template)) || (isSection && !!metadata.updated);
    if (needsDate && !metadata.date && (changes.date === '' || (isSection && !!changes.updated))) throw new StudioError(400, '这类内容需要发布时间，请选择日期后保存');
    if (!metadata.title || typeof metadata.title !== 'string') throw new StudioError(400, '请填写标题');
    return this.repository.write(path, text, revision || null);
  }
  async removeDocument(path: string, revision: string) {
    documentPath(path);
    return this.repository.write(path, null, revision);
  }
}
