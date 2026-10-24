import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { imageMime, type MediaFile, type MediaListing } from '../shared/media.js';
import { StudioError } from './errors.js';

export const MAX_MEDIA_SIZE = 20 * 1024 * 1024;
const MAX_MEDIA_FILES = 5000, MAX_VISITED = 20000;
export function validateMediaPath(path: string): void {
  if (typeof path !== 'string' || path.length > 1000 || !/^(static|content)\//.test(path) || !imageMime(path)
    || /[\\\x00-\x1f\x7f%?#]/.test(path) || path.split('/').some(part => !part || part.startsWith('.')))
    throw new StudioError(400, '请选择仓库 static 或 content 目录中的图片');
}
export async function safeMediaPath(rootPath: string, path: string): Promise<string> {
  const root = await realpath(resolve(rootPath));
  let file = root;
  for (const part of path.split('/')) {
    file = join(file, part);
    try { if ((await lstat(file)).isSymbolicLink()) throw new StudioError(400, '图片路径不允许使用符号链接'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return file;
}
export async function listMediaFiles(root: string): Promise<MediaListing> {
  const result: MediaListing = { items: [], truncated: false };
  let visited = 0;
  const walk = async (directory: string): Promise<void> => {
    if (result.truncated) return;
    const safe = await safeMediaPath(root, directory);
    let entries;
    try { entries = await readdir(safe, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (++visited > MAX_VISITED || result.items.length >= MAX_MEDIA_FILES) { result.truncated = true; return; }
      if (entry.isSymbolicLink() || entry.name.startsWith('.') || ['node_modules', 'processed_images', 'public'].includes(entry.name)) continue;
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) { await walk(path); if (result.truncated) return; }
      else if (entry.isFile() && imageMime(path)) {
        try { validateMediaPath(path); } catch { continue; }
        const stat = await lstat(await safeMediaPath(root, path));
        result.items.push({ path, name: entry.name, directory, mime: imageMime(path)!, size: stat.size, ...(stat.size > MAX_MEDIA_SIZE ? { unavailable: '图片超过 20 MB 预览限制' } : {}) });
      }
    }
  };
  await walk('static'); await walk('content');
  return result;
}
export async function readMediaFile(root: string, path: string): Promise<MediaFile | null> {
  validateMediaPath(path);
  try {
    const file = await safeMediaPath(root, path);
    const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) throw new StudioError(400, '请选择图片文件');
      if (stat.size > MAX_MEDIA_SIZE) throw new StudioError(413, '图片超过 20 MB 预览限制');
      const data = await handle.readFile();
      if (data.byteLength > MAX_MEDIA_SIZE) throw new StudioError(413, '图片超过 20 MB 预览限制');
      return { data: new Uint8Array(data), mime: imageMime(path)! };
    } finally { await handle.close(); }
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
