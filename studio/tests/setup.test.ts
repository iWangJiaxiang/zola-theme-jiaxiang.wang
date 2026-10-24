import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cliLocale, configurationError, diagnose, localSiteProblem, makeSetupEnvironment, serializeEnvironment, writeNewEnvironment } from '../scripts/setup-support.js';
import { verifyPassword } from '../server/password.js';

const base = { STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_ADMIN_USER: 'owner', STUDIO_ADMIN_PASSWORD_HASH: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}` };
async function site(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'studio-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'content'));
  await writeFile(join(root, 'config.toml'), 'title = "Example"\n');
  await writeFile(join(root, 'data.toml'), '[post]\n');
  return root;
}
test('setup generates private, parseable credentials without storing the password or overwriting files', async t => {
  const root = await site(t);
  const password = 'test-setup-password-2026';
  const env = await makeSetupEnvironment({ origin: 'http://localhost:5173', siteRoot: root, username: 'owner', password });
  assert.match(env.STUDIO_SESSION_SECRET, /^[a-f0-9]{64}$/);
  assert.equal(await verifyPassword(password, env.STUDIO_ADMIN_PASSWORD_HASH), true);
  const path = join(root, '.env');
  await writeNewEnvironment(path, env);
  const text = await readFile(path, 'utf8');
  assert.equal(text.includes(password), false);
  assert.deepEqual({ ...parseEnv(text) }, env);
  if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o777, 0o600);
  await assert.rejects(() => writeNewEnvironment(path, { ...env, STUDIO_ADMIN_USER: 'different' }), { code: 'EEXIST' });
  assert.equal(await readFile(path, 'utf8'), text);
  const link = join(root, 'linked.env'); await symlink(path, link);
  await assert.rejects(() => writeNewEnvironment(link, env), { code: 'EEXIST' });
  const run = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('../scripts/setup.ts', import.meta.url)), '--lang', 'en'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /already exists/);
  assert.equal(await readFile(path, 'utf8'), text);
});
test('dotenv serialization preserves dollars, comments and quotes and rejects line injection', () => {
  for (const value of ["O'Reilly", "a'b\\nTOKEN", 'say "hi"', `O'Reilly says "hi" $TOKEN # literal`, 'token`with$sign', 'C:\\site\\blog']) {
    assert.equal(parseEnv(serializeEnvironment({ STUDIO_GIT_TOKEN: value })).STUDIO_GIT_TOKEN, value);
  }
  assert.throws(() => serializeEnvironment({ STUDIO_GIT_TOKEN: 'value\nINJECTED=yes' }));
  assert.throws(() => serializeEnvironment({ 'STUDIO_X\nINJECTED': 'value' }));
});
test('local diagnostics catch wrong roots and broken TOML without writing site files or leaking content', async t => {
  const root = await site(t);
  assert.equal(await localSiteProblem(root), null);
  const env = { ...base, STUDIO_SITE_ROOT: root };
  assert.equal((await diagnose(env)).some(item => item.status === 'fail'), false);
  await writeFile(join(root, 'data.toml'), 'private-secret-content = [ invalid');
  const result = await diagnose(env);
  assert.ok(result.some(item => item.status === 'fail' && item.en.includes('data.toml')));
  assert.equal(JSON.stringify(result).includes('private-secret-content'), false);
  assert.equal(await readFile(join(root, 'data.toml'), 'utf8'), 'private-secret-content = [ invalid');
  assert.equal(await localSiteProblem(join(root, 'missing')), 'config.toml');
});
test('Git diagnostics do not contact the network by default or claim push permission; Blob inspection works off-platform', async () => {
  const result = await diagnose({ ...base, STUDIO_GIT_URL: 'https://git.invalid/repo.git', STUDIO_GIT_TOKEN: 'secret-value', STUDIO_STATE: 'blob', STUDIO_ORIGIN: 'https://studio.example' });
  assert.equal(result.some(item => item.status === 'fail'), false);
  assert.ok(result.some(item => item.en.includes('connection is not tested')));
  assert.ok(result.some(item => item.en.includes('Push permission')));
  assert.ok(result.some(item => item.en.includes('Makers runtime')));
  assert.equal(JSON.stringify(result).includes('secret-value'), false);
});
test('CLI languages and configuration failures never print unknown exception details', async () => {
  assert.equal(cliLocale([], { LANG: 'zh_CN.UTF-8' }), 'zh-CN');
  assert.equal(cliLocale([], { LC_ALL: 'en_US.UTF-8', LANG: 'zh_CN.UTF-8' }), 'en');
  assert.equal(cliLocale(['--lang', 'en'], { LANG: 'zh_CN' }), 'en');
  assert.throws(() => cliLocale(['--lang', 'de']));
  assert.equal(configurationError(new Error('secret-token-in-url'), 'en').includes('secret-token'), false);
  const result = await diagnose({ ...base, STUDIO_ORIGIN: 'secret-token-in-url' });
  assert.equal(result[0].status, 'fail');
  assert.equal(JSON.stringify(result).includes('secret-token'), false);
});

test('first-start and noninteractive commands explain the next step without exposing credentials', async t => {
  const root = await site(t);
  const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('STUDIO_')));
  for (const [script, expected] of [['scripts/setup.ts', /interactive terminal/], ['scripts/password.ts', /interactive terminal/], ['server/dev.ts', /npm run setup.*npm run doctor/]] as const) {
    const run = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('../' + script, import.meta.url)), '--lang', 'en'], {
      cwd: root, encoding: 'utf8', env: { ...cleanEnv, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', STUDIO_ORIGIN: 'secret-token-in-invalid-url' },
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, expected);
    assert.equal(run.stderr.includes('secret-token'), false);
    assert.equal(run.stderr.includes('    at '), false);
  }
});


test('invalid CLI language prints usage without a stack trace', () => {
  for (const name of ['setup', 'doctor', 'password']) {
    const run = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('../scripts/' + name + '.ts', import.meta.url)), '--lang', 'invalid'], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Use --lang en or --lang zh-CN/);
    assert.equal(run.stderr.includes('    at '), false);
  }
});
