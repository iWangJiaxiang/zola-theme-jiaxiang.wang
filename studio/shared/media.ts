export interface MediaItem { path: string; name: string; directory: string; mime: string; size: number; unavailable?: string }
export interface MediaListing { items: MediaItem[]; truncated: boolean; maxFileSize?: number }
export interface MediaFile { data: Uint8Array; mime: string }
export interface MediaUploadResult { item: MediaItem; message: string; commit?: string }
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
// Leave room below the platform's 6 MB request/response envelope.
export const MAKERS_MEDIA_SIZE = 4 * 1024 * 1024;
export type MediaMode = 'library' | 'public' | 'colocated' | 'document';
export const mediaTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp' };
export const imageExtension = (path: string) => path.split('.').at(-1)?.toLowerCase() || '';
export const imageMime = (path: string) => Object.hasOwn(mediaTypes, imageExtension(path)) ? mediaTypes[imageExtension(path)] : undefined;
export const documentDirectory = (path: string) => path.slice(0, path.lastIndexOf('/') + 1);
export const supportsColocatedMedia = (path: string) => /\/(?:_)?index\.md$/.test(path);
export function mediaValue(item: MediaItem, mode: MediaMode, documentPath = ''): string | null {
  if (item.unavailable) return null;
  if (mode === 'library') return item.path.startsWith('static/') ? '/' + item.path.slice(7) : item.path;
  if (item.path.startsWith('static/')) return mode !== 'colocated' ? '/' + item.path.slice(7) : null;
  const directory = documentDirectory(documentPath);
  // Only bundle pages and sections publish direct siblings at their own URL.
  if ((mode === 'colocated' || mode === 'document') && supportsColocatedMedia(documentPath) && directory && item.directory + '/' === directory) return item.name;
  return null;
}
export function isImageField(path: string): boolean {
  const key = path.split('.').at(-1) || '';
  if (/^extra\.about\.photos\.\d+\.url$/.test(path)) return true;
  if (/^extra\.about\.careers\.tags\.\d+\.background$/.test(path)) return false;
  return ['cover', 'global_cover', 'default_cover', 'logo', 'local_logo', 'favicon', 'avatar', 'image', 'img', 'bg', 'background', 'backgroundDark', 'qrcode', 'wxPay', 'alipay', 'svg_sprite', 'loading_bar', 'wechatImg', 'wechatImgFace', 'wechatImgBack', 'siteshot', 'poster', 'photo', 'picture'].includes(key) || /(?:_image|_img|_cover|_logo|_avatar|_qrcode|_photo|_picture|bg_url)$/.test(key);
}
export function isBackupImageField(path: string): boolean {
  return /^(?:groups\.\d+\.links|friend\.groups\.\d+\.items)\.\d+\.logo$/.test(path);
}
export function storedMediaPath(value: string, mode: MediaMode, documentPath = ''): string | null {
  if (!value || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(value)) return null;
  if (mode === 'colocated' && !value.startsWith('/')) return supportsColocatedMedia(documentPath) ? documentDirectory(documentPath) + value : null;
  if (value.startsWith('/')) return 'static/' + value.slice(1);
  if (value.startsWith('static/')) return value;
  if (mode === 'document' && supportsColocatedMedia(documentPath)) return documentDirectory(documentPath) + value;
  return null;
}
export const mediaURL = (path: string, version = 0) => `/api/media/file?path=${encodeURIComponent(path)}&v=${version}`;
export function formatBytes(size: number): string { return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
export const markdownImage = (item: MediaItem, path: string) => `![${item.name.replace(/[\[\]\\\r\n]/g, '')}](${path.split('/').map(part => encodeURIComponent(part).replaceAll('(', '%28').replaceAll(')', '%29')).join('/')})`;
