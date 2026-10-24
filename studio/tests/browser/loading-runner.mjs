import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../../server/password.ts';
import { checkLoading } from './loading.mjs';

const studio = fileURLToPath(new URL('../../', import.meta.url));
const base = await mkdtemp(join(tmpdir(), 'studio-loading-'));
let server, browser;
try {
  const site = join(base, 'site'), screenshots = join(studio, 'test-results');
  await mkdir(join(site, 'content/articles/example'), { recursive: true });
  await mkdir(screenshots, { recursive: true });
  await writeFile(join(site, 'config.toml'), 'title="Loading test"\nbase_url="https://example.com"\n');
  await writeFile(join(site, 'data.toml'), '[post]\ntags=[]\ncategories=[]\n');
  await writeFile(join(site, 'content/articles/example/index.md'), '+++\ntitle="Example"\ndraft=true\n+++\nExample text.\n');
  const reserve = createServer();
  await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const origin = `http://localhost:${port}`, password = randomBytes(24).toString('hex');
  server = spawn(process.execPath, ['dist/server.mjs'], { cwd: studio, env: { ...process.env,
    STUDIO_ORIGIN: origin, PORT: String(port), STUDIO_HOST: '127.0.0.1', STUDIO_SITE_ROOT: site,
    STUDIO_STATE: 'file', STUDIO_STATE_DIR: join(base, 'state'), STUDIO_GIT_URL: '', STUDIO_OIDC_ISSUER: '',
    STUDIO_ADMIN_USER: 'owner', STUDIO_ADMIN_PASSWORD_HASH: await hashPassword(password), STUDIO_SESSION_SECRET: randomBytes(32).toString('hex'),
  }, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + '/api/auth/config')).ok) break; } catch { /* Wait for the local fixture server. */ }
    if (i === 99) throw new Error('Local loading fixture did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const executablePath = process.env.STUDIO_TEST_BROWSER || ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
  if (!executablePath) throw new Error('Set STUDIO_TEST_BROWSER to a Chromium executable.');
  browser = await puppeteer.launch({ headless: true, executablePath });
  const login = await fetch(origin + '/api/auth/login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'owner', password }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0], split = cookie.indexOf('=');
  await browser.setCookie({ name: cookie.slice(0, split), value: cookie.slice(split + 1), domain: 'localhost', path: '/', httpOnly: true });
  await checkLoading({ browser, origin, screenshots });
} finally {
  await browser?.close();
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
  await rm(base, { recursive: true, force: true });
}
