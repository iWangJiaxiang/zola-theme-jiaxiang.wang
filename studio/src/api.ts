import { ref } from 'vue';
import { locale, type Message } from './i18n';
import type { MessageParams } from '../shared/i18n';
import type { Identity } from '../shared/types.js';
export const session = ref<{ identity: Identity; csrf: string; expires: number } | null>(null);
export const reauthentication = ref(false);
export class ApiError extends Error { constructor(message: string, public status: number, public params?: MessageParams) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const binary = body instanceof Blob;
  let response: Response;
  try { response = await fetch(`/api${path}`, { method, credentials: 'same-origin',
    ...(method === 'GET' ? { signal: AbortSignal.timeout(60_000) } : {}),
    headers: { 'Accept-Language': locale.value, ...(body === undefined ? {} : { 'Content-Type': binary ? 'application/octet-stream' : 'application/json' }), ...(session.value ? { 'X-CSRF-Token': session.value.csrf } : {}) },
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body) });
  } catch (error) {
    if (method !== 'GET') throw error;
    throw new ApiError(error instanceof Error && error.name === 'TimeoutError' ? '连接超时，请重试。' : '网络连接失败，请检查网络后重试。', 408);
  }
  const data = await response.json().catch(() => { throw new ApiError(response.status === 413 ? '文件超过服务器上传限制，请选择较小的图片' : '请求失败，请稍后再试', response.ok ? 502 : response.status); });
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && session.value) reauthentication.value = true;
    throw new ApiError(data.messageKey || data.error || '请求失败，请稍后再试', response.status, data.params);
  }
  return data as T;
}
export const errorMessage = (error: unknown): Message => error instanceof ApiError ? { key: error.message, params: error.params } : error instanceof Error ? error.message : '操作失败';
