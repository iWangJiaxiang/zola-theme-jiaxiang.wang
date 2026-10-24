import { ref, shallowRef, watch } from 'vue';
import type { Message } from './i18n';
import { api, errorMessage, session } from './api';
import type { MediaItem, MediaListing } from '../shared/media';
export const mediaListing = shallowRef<MediaListing>({ items: [], truncated: false });
export const mediaLoading = ref(false), mediaError = ref<Message>(''), mediaVersion = ref(0);
export const mediaUploading = ref(false);
export function addUploadedMedia(item: MediaItem) {
  mediaListing.value = { ...mediaListing.value, items: [...mediaListing.value.items.filter(existing => existing.path !== item.path), item].sort((a, b) => a.path.localeCompare(b.path)) };
  loadedAt = Date.now(); mediaError.value = ''; mediaVersion.value++;
}
let request: Promise<void> | undefined, generation = 0, loadedAt = 0;
watch(() => session.value?.identity.id, () => { generation++; request = undefined; loadedAt = 0; mediaListing.value = { items: [], truncated: false }; mediaError.value = ''; mediaLoading.value = false; });
export function loadMedia(refresh = false): Promise<void> {
  if (mediaUploading.value) return request || Promise.resolve();
  if (request) return request;
  if (!refresh && loadedAt && Date.now() - loadedAt < 60_000) return Promise.resolve();
  const current = generation;
  mediaLoading.value = true; mediaError.value = '';
  request = (async () => {
    try {
      const result = await api<MediaListing>('/media' + (refresh ? '?refresh=1' : ''));
      if (current !== generation) return;
      mediaListing.value = result; loadedAt = Date.now(); mediaVersion.value++;
    } catch (error) { if (current === generation) mediaError.value = errorMessage(error); }
    finally { if (current === generation) { mediaLoading.value = false; request = undefined; } }
  })();
  return request;
}
