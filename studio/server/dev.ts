import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { getRequestListener } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApp } from './app.js';
import { loadStartupConfig } from './startup.js';
const options = loadStartupConfig();
const app = new Hono();
app.route('/', createApp(options));
app.get('/vendor/vditor/*', serveStatic({ root: './node_modules/vditor', rewriteRequestPath: path => path.replace('/vendor/vditor', '') }));
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
const listener = getRequestListener(app.fetch);
const port = Number(new URL(options.config.origin).port || 5173);
createHttpServer((req, res) => {
  if (req.url?.startsWith('/api/') || req.url?.startsWith('/vendor/vditor/')) void listener(req, res);
  else vite.middlewares(req, res);
}).listen(port, '127.0.0.1', () => console.log(`Creator Studio: ${options.config.origin}`));
