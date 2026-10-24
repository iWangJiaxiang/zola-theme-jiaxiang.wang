import type { MediaFile, MediaListing, MediaUploadResult } from '../shared/media.js';
import { uploadMediaFile } from './media-upload.js';
import { listMediaFiles, readMediaFile } from './media-files.js';
import type { FileSnapshot, SaveResult } from '../shared/types.js';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { StudioError } from './errors.js';

export const revisionOf = (text: string) => createHash('sha256').update(text).digest('hex');
export function validatePath(path: string): void {
  if (typeof path !== 'string' || path.length > 500 || path.includes('\\') || /[\x00-\x1f\x7f%]/.test(path)
    || path.split('/').some(p => !p || p.startsWith('.'))
    || !(/^(config\.toml|data\.toml|static\/data\/friends\.json)$/.test(path)
      || /^content\/(articles|pages|collections)\/.+\.md$/.test(path))) {
    throw new StudioError(400, '不允许访问此文件路径');
  }
}
export interface Repository {
  readonly mode: 'local' | 'git';
  clearReadCache?(): void;
  read(path: string): Promise<FileSnapshot | null>;
  list(): Promise<FileSnapshot[]>;
  listMedia(refresh?: boolean): Promise<MediaListing>;
  readMedia(path: string): Promise<MediaFile | null>;
  uploadMedia(directory: string, name: string, data: Uint8Array): Promise<MediaUploadResult>;
  write(path: string, text: string | null, expectedRevision: string | null): Promise<SaveResult>;
}
export class LocalRepository implements Repository {
  readonly mode = 'local';
  constructor(public root: string) {}
  private async safePath(path: string): Promise<string> {
    validatePath(path);
    const root = await realpath(resolve(this.root));
    let current = root;
    for (const part of path.split('/')) {
      current = join(current, part);
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new StudioError(400, '不允许读写符号链接');
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return current;
  }
  async read(path: string): Promise<FileSnapshot | null> {
    const file = await this.safePath(path);
    try {
      if ((await lstat(file)).size > 1024 * 1024) throw new StudioError(413, '文件超过 1 MB 编辑限制');
      const text = await readFile(file, 'utf8');
      return { path, text, revision: revisionOf(text) };
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  async list(): Promise<FileSnapshot[]> {
    const files: FileSnapshot[] = [];
    const walk = async (directory: string): Promise<void> => {
      let entries;
      try { entries = await readdir(join(this.root, directory), { withFileTypes: true }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await walk(path);
        else if (entry.name.endsWith('.md')) { const file = await this.read(path); if (file) files.push(file); }
      }
    };
    for (const kind of ['articles', 'pages', 'collections']) {
      // Check the top directory too, so a symlink cannot be used to list secrets.
      await this.safePath(`content/${kind}/placeholder.md`);
      await walk(`content/${kind}`);
    }
    return files;
  }
  async listMedia(): Promise<MediaListing> { return listMediaFiles(this.root); }
  async readMedia(path: string): Promise<MediaFile | null> { return readMediaFile(this.root, path); }
  async uploadMedia(directory: string, name: string, data: Uint8Array): Promise<MediaUploadResult> { return uploadMediaFile(this.root, directory, name, data); }
  async write(path: string, text: string | null, expectedRevision: string | null): Promise<SaveResult> {
    const file = await this.safePath(path);
    if (text !== null && Buffer.byteLength(text) > 1024 * 1024) throw new StudioError(413, '文件超过 1 MB 编辑限制');
    const lock = join(this.root, '.studio-write-lock');
    let acquired = false;
    for (let i = 0; i < 80; i++) {
      try { await mkdir(lock); acquired = true; break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        await new Promise(r => setTimeout(r, 25));
      }
    }
    if (!acquired) throw new StudioError(423, '另一个保存任务正在执行，请稍后重试');
    try {
      const previous = await this.read(path);
      if ((previous?.revision ?? null) !== expectedRevision) throw new StudioError(409, '文件已更新，请重新加载并合并修改');
      if (path.endsWith('/_index.md') && text === null) {
        const children = await readdir(dirname(file));
        if (children.some(p => p !== '_index.md')) throw new StudioError(409, '专栏或合集仍有子内容，不能删除');
      }
      if (previous) {
        const history = join(this.root, '.studio-history');
        const backup = join(history, revisionOf(path));
        for (const directory of [history, backup]) {
          try { if ((await lstat(directory)).isSymbolicLink()) throw new StudioError(400, '历史备份不允许使用符号链接'); }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          await mkdir(directory, { recursive: true, mode: 0o700 });
        }
        // Immutable backups: exclusive creation must never follow an existing symlink.
        try { await writeFile(join(backup, `${previous.revision}.txt`), previous.text, { mode: 0o600, flag: 'wx' }); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      }
      if (text === null) await rm(file, { force: true });
      else {
        await mkdir(dirname(file), { recursive: true });
        await this.safePath(path);
        const temporary = `${file}.${randomUUID()}.tmp`;
        try { await writeFile(temporary, text, { mode: 0o600 }); await rename(temporary, file); }
        finally { await rm(temporary, { force: true }); }
      }
      return { revision: text === null ? '' : revisionOf(text), message: '已保存到站点文件；需要构建后更新公开网站' };
    } finally { await rm(lock, { recursive: true, force: true }); }
  }
}
