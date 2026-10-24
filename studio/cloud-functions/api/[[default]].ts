import { createApp } from '../../server/app.js';
import { loadConfig } from '../../server/config.js';
import { MAKERS_MEDIA_SIZE } from '../../shared/media.js';
let app: ReturnType<typeof createApp> | undefined;
// Keep a named export: the platform scanner does not recognize a bundled default alias.
export function onRequest(context: { request: Request; env?: Record<string, string> }): Response | Promise<Response> {
  if (!app) {
    const env = { ...process.env, ...context.env };
    if (env.STUDIO_STATE !== 'blob' || !env.STUDIO_GIT_URL || !env.STUDIO_ORIGIN?.startsWith('https://')) {
      console.error('Studio cloud configuration requires Blob state, HTTPS origin, and a Git repository.');
      return new Response('管理中心部署配置不完整，请检查服务端环境变量。', { status: 503 });
    }
    try { app = createApp({ ...loadConfig(env), mediaLimit: MAKERS_MEDIA_SIZE }); }
    catch { console.error('Studio cloud configuration is invalid.'); return new Response('管理中心配置不可用。', { status: 503 }); }
  }
  return app.fetch(context.request);
}
export default onRequest;
