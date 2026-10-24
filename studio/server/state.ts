import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getStore } from '@edgeone/pages-blob';
import { revisionOf } from './repository.js';

export interface StateStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}
export class FileState implements StateStore {
  constructor(private root: string) {}
  private path(key: string) { return join(this.root, `${revisionOf(key)}.json`); }
  async get<T>(key: string): Promise<T | null> {
    try { return JSON.parse(await readFile(this.path(key), 'utf8')) as T; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  async set<T>(key: string, value: T): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const temporary = `${this.path(key)}.${randomUUID()}`;
    try { await writeFile(temporary, JSON.stringify(value), { mode: 0o600 }); await rename(temporary, this.path(key)); }
    finally { await rm(temporary, { force: true }); }
  }
  async delete(key: string): Promise<void> { await rm(this.path(key), { force: true }); }
}
export class BlobState implements StateStore {
  private store = getStore('wondershine-studio-private');
  async get<T>(key: string): Promise<T | null> { return await this.store.get(key, { type: 'json', consistency: 'strong' }) as T | null; }
  async set<T>(key: string, value: T): Promise<void> { await this.store.setJSON(key, value, { cacheControl: 'private, no-store' }); }
  async delete(key: string): Promise<void> { await this.store.delete(key); }
}
