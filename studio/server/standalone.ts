import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApp } from './app.js';
import { loadStartupConfig } from './startup.js';
const options = loadStartupConfig();
const app = new Hono();
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff'); c.header('Referrer-Policy', 'no-referrer'); c.header('X-Frame-Options', 'DENY');
  await next();
});
app.route('/', createApp(options));
const root = join(fileURLToPath(new URL('.', import.meta.url)), 'client');
app.get('/*', serveStatic({ root }));
serve({ fetch: app.fetch, port: Number(process.env.PORT || 5173), hostname: process.env.STUDIO_HOST || '127.0.0.1' }, info => {
  console.log(`Creator Studio listening on port ${info.port}; public origin ${options.config.origin}`);
});
