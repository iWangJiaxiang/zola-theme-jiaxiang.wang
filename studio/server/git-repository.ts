import fs from 'node:fs';
import type { MediaFile, MediaListing, MediaUploadResult } from '../shared/media.js';
import { validateUpload } from './media-upload.js';
import { validateMediaPath } from './media-files.js';
import { MediaCheckout } from './media-checkout.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import git from 'isomorphic-git';
import type { HttpClient } from 'isomorphic-git';
import type { FileSnapshot, SaveResult } from '../shared/types.js';
import { LocalRepository, type Repository, validatePath } from './repository.js';
import { StudioError } from './errors.js';

export interface GitOptions { url: string; branch: string; username: string; token: string; name: string; email: string }
export class GitRepository implements Repository {
  readonly mode = 'git';
  private origin: string;
  constructor(private options: GitOptions) {
    const url = new URL(options.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Git URL 必须是无内嵌凭据的 HTTPS 地址');
    if (!/^[\w][\w/.-]*$/.test(options.branch) || options.branch.includes('..') || options.branch.endsWith('/')) throw new Error('Git 分支名称无效');
    this.origin = url.origin;
  }
  private http: HttpClient = { request: async request => {
    // Never forward repository credentials through redirects or to another host.
    if (new URL(request.url).origin !== this.origin) throw new Error('Git 请求越过配置的域名');
    const parts: Uint8Array[] = [];
    if (request.body) for await (const part of request.body) parts.push(part);
    const response = await fetch(request.url, {
      method: request.method, headers: request.headers, redirect: 'error',
      body: parts.length ? Buffer.concat(parts) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    async function* body() { yield bytes; }
    return { url: response.url, method: request.method!, statusCode: response.status, statusMessage: response.statusText,
      headers: Object.fromEntries(response.headers.entries()), body: body() };
  } };
  private readCheckout = new MediaCheckout(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'wondershine-read-'));
    try {
      await git.clone({ fs, http: this.http, dir: directory, url: this.options.url, ref: this.options.branch,
        singleBranch: true, depth: 1, onAuth: () => ({ username: this.options.username, password: this.options.token }) });
      return { directory, repo: new LocalRepository(directory) };
    } catch {
      await rm(directory, { recursive: true, force: true });
      throw new StudioError(502, 'Git 操作失败，请检查仓库连接、权限和分支；本次修改尚未确认发布');
    }
  }, value => rm(value.directory, { recursive: true, force: true }), 30_000);
  async listMedia(refresh = false): Promise<MediaListing> { return this.readCheckout.use(value => value.repo.listMedia(), refresh); }
  async readMedia(path: string): Promise<MediaFile | null> { validateMediaPath(path); return this.readCheckout.use(value => value.repo.readMedia(path)); }
  clearReadCache() { this.readCheckout.clear(); }
  clearMediaCache() { this.clearReadCache(); }
  async uploadMedia(directory: string, name: string, data: Uint8Array): Promise<MediaUploadResult> {
    validateUpload(directory, name, data);
    return this.checkout(async (repo, dir) => {
      const saved = await repo.uploadMedia(directory, name, data);
      await git.add({ fs, dir, filepath: saved.item.path });
      const commit = await git.commit({ fs, dir, message: `feat(media): upload ${saved.item.path}`,
        author: { name: this.options.name, email: this.options.email } });
      try {
        const pushed = await git.push({ fs, http: this.http, dir, remote: 'origin', ref: this.options.branch,
          force: false, onAuth: () => ({ username: this.options.username, password: this.options.token }) });
        if (!pushed.ok) throw new Error('push rejected');
      } catch { throw new StudioError(409, 'Git 推送未确认，请刷新媒体库检查图片是否已保存后再重试'); }
      finally { this.clearMediaCache(); }
      return { ...saved, commit };
    });
  }
  private async checkout<T>(operation: (repo: LocalRepository, directory: string) => Promise<T>): Promise<T> {
    const directory = await mkdtemp(join(tmpdir(), 'wondershine-studio-'));
    try {
      await git.clone({ fs, http: this.http, dir: directory, url: this.options.url, ref: this.options.branch,
        singleBranch: true, depth: 1, onAuth: () => ({ username: this.options.username, password: this.options.token }) });
      return await operation(new LocalRepository(directory), directory);
    } catch (error) {
      if (error instanceof StudioError) throw error;
      throw new StudioError(502, 'Git 操作失败，请检查仓库连接、权限和分支；本次修改尚未确认发布');
    } finally { this.clearReadCache(); await rm(directory, { recursive: true, force: true }); }
  }
  async read(path: string): Promise<FileSnapshot | null> { validatePath(path); return this.readCheckout.use(value => value.repo.read(path)); }
  async list(): Promise<FileSnapshot[]> { return this.readCheckout.use(value => value.repo.list()); }
  async write(path: string, text: string | null, expectedRevision: string | null): Promise<SaveResult> {
    validatePath(path);
    return this.checkout(async (repo, dir) => {
      const saved = await repo.write(path, text, expectedRevision);
      if (text === null) await git.remove({ fs, dir, filepath: path });
      else await git.add({ fs, dir, filepath: path });
      const commit = await git.commit({ fs, dir, message: `docs(content): ${text === null ? 'remove' : 'update'} ${path}`,
        author: { name: this.options.name, email: this.options.email } });
      try {
        const pushed = await git.push({ fs, http: this.http, dir, remote: 'origin', ref: this.options.branch,
          force: false, onAuth: () => ({ username: this.options.username, password: this.options.token }) });
        if (!pushed.ok) throw new Error('push rejected');
      } catch { throw new StudioError(409, 'Git 推送未确认，可能有新提交或分支保护。请重新加载检查，勿重复覆盖'); }
      return { ...saved, commit, message: '已提交到 Git；网站是否上线请以部署平台结果为准' };
    });
  }
}
