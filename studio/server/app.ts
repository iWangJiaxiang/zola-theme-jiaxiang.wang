import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Configuration } from 'openid-client';
import type { StudioConfig } from './config.js';
import type { Repository } from './repository.js';
import type { StateStore } from './state.js';
import { Authentication, type Session } from './auth.js';
import { OidcAuthentication } from './oidc.js';
import { verifyPassword } from './password.js';
import { ContentService } from './content-service.js';
import { StudioError } from './errors.js';
import { settingsSchemas } from '../shared/settings.js';
import { MAX_UPLOAD_SIZE } from '../shared/media.js';
import { readUploadBody } from './media-upload.js';
export interface AppOptions { config: StudioConfig; repository: Repository; state: StateStore; mediaLimit?: number; oidcDiscover?: () => Promise<Configuration> }
export function createApp(options: AppOptions) {
  const app = new Hono<{ Variables: { session: Session } }>();
  const auth = new Authentication(options.config, options.state);
  const oidc = new OidcAuthentication(auth, options.oidcDiscover);
  const content = new ContentService(options.repository);
  const mediaLimit = Math.min(options.mediaLimit ?? MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE);
  // Per-instance protection supplements the mandatory edge login rate-limit rule.
  let attempts: number[] = [];
  let activePasswordCheck = false;
  app.use('/api/*', async (c, next) => c.req.path === '/api/media/upload' && c.req.method === 'POST' ? next()
    : bodyLimit({ maxSize: 1024 * 1024, onError: c => c.json({ error: '请求超过 1 MB 限制' }, 413) })(c, next));
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof StudioError) return c.json({ error: error.message, messageKey: error.message, params: error.params }, error.status as 400);
    if (error instanceof SyntaxError) return c.json({ error: '内容格式不正确，请检查输入' }, 400);
    console.error('Studio request failed:', error.name);
    return c.json({ error: '操作失败，请检查服务端连接和配置；未确认的更改请保留草稿' }, 500);
  });
  app.get('/api/auth/config', c => c.json({ password: !!options.config.passwordHash,
    oidc: options.config.oidc ? { label: options.config.oidc.label } : null }));
  app.post('/api/auth/login', async c => {
    auth.checkOrigin(c);
    if (!options.config.passwordHash) throw new StudioError(404, '未启用账号密码登录');
    attempts = attempts.filter(time => Date.now() - time < 60_000);
    if (attempts.length >= 5 || activePasswordCheck) throw new StudioError(429, '登录尝试过于频繁，请一分钟后重试');
    attempts.push(Date.now());
    const input = await c.req.json<{ username: string; password: string }>();
    if (typeof input.password !== 'string' || typeof input.username !== 'string') throw new StudioError(400, '请输入账号和密码');
    activePasswordCheck = true;
    try {
      const valid = await verifyPassword(input.password, options.config.passwordHash);
      if (!valid || input.username !== options.config.username) throw new StudioError(401, '账号或密码错误');
    } finally { activePasswordCheck = false; }
    const session = await auth.create(c, { id: options.config.username!, name: options.config.username!, method: 'password' });
    return c.json(session);
  });
  app.get('/api/auth/oidc/start', async c => c.redirect(await oidc.start(c)));
  app.get('/api/auth/oidc/callback', async c => {
    try { await auth.create(c, await oidc.finish(c)); return c.redirect('/'); }
    catch (error) {
      // Only an error code crosses the redirect; no tokens or provider details enter URLs.
      const code = error instanceof StudioError && error.status === 403 ? 'denied' : 'failed';
      return c.redirect(`/?login=${code}`);
    }
  });
  app.get('/api/auth/session', async c => {
    const session = await auth.read(c);
    if (!session) throw new StudioError(401, '请先登录');
    return c.json(session);
  });
  app.use('/api/*', async (c, next) => {
    const session = await auth.read(c);
    if (!session) throw new StudioError(401, '请先登录');
    c.set('session', session);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      auth.checkCsrf(c, session);
      // Preflight revision checks must see fresh data even on a previously warm instance.
      options.repository.clearReadCache?.();
    }
    await next();
  });
  app.post('/api/auth/logout', async c => { await auth.revoke(c); return c.json({ ok: true }); });
  app.get('/api/bootstrap', async c => {
    if (c.req.query('refresh') === '1') options.repository.clearReadCache?.();
    const [site, appearance] = await Promise.all([content.settings('site'), content.settings('appearance')]);
    return c.json({ site: site.values, appearance: appearance.values, mode: options.repository.mode,
      groups: settingsSchemas.map(({ id, title, description }) => ({ id, title, description })) });
  });
  app.get('/api/settings/:id', async c => c.json(await content.settings(c.req.param('id'))));
  app.put('/api/settings/:id', async c => {
    const input = await c.req.json<{ revision: string | null; changes: unknown }>();
    return c.json(await content.saveSettings(c.req.param('id'), input.changes, input.revision));
  });
  app.get('/api/media', async c => {
    const listing = await options.repository.listMedia(c.req.query('refresh') === '1');
    return c.json({ ...listing, maxFileSize: mediaLimit, items: listing.items.map(item => ({ ...item,
      ...(item.size > mediaLimit ? { unavailable: '图片超过当前部署的预览限制，请压缩后使用' } : {}) })) });
  });
  app.post('/api/media/upload', bodyLimit({ maxSize: mediaLimit, onError: c => c.json({ error: '每张图片不能超过 {limit} MB', messageKey: '每张图片不能超过 {limit} MB', params: { limit: mediaLimit / 1024 / 1024 } }, 413) }), async c => {
    const bytes = await readUploadBody(c.req.raw, mediaLimit);
    const result = await options.repository.uploadMedia(c.req.query('directory') || '', c.req.query('filename') || '', bytes);
    return c.json(result, 201);
  });
  app.get('/api/media/file', async c => {
    const image = await options.repository.readMedia(c.req.query('path') || '');
    if (!image) throw new StudioError(404, '仓库中未找到这张图片，请刷新媒体库');
    if (image.data.byteLength > mediaLimit) throw new StudioError(413, '图片超过当前部署的预览限制，请压缩后使用');
    c.header('Content-Type', image.mime);
    c.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
    c.header('Cross-Origin-Resource-Policy', 'same-origin');
    c.header('Content-Disposition', 'inline');
    return c.body(new Uint8Array(image.data).buffer);
  });
  app.get('/api/content', async c => {
    if (c.req.query('refresh') === '1') options.repository.clearReadCache?.();
    return c.json(await content.list());
  });
  app.get('/api/document', async c => c.json(await content.document(c.req.query('path') || '')));
  app.put('/api/document', async c => {
    const input = await c.req.json<{ path: string; changes: unknown; body: string; revision: string | null }>();
    return c.json(await content.saveDocument(input.path, input.changes, input.body, input.revision));
  });
  app.delete('/api/document', async c => {
    const input = await c.req.json<{ path: string; revision: string }>();
    return c.json(await content.removeDocument(input.path, input.revision));
  });
  app.notFound(c => c.json({ error: '未找到此接口' }, 404));
  return app;
}
