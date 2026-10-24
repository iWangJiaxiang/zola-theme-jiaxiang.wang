import { lstat, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { parse } from 'smol-toml';
import { inspectConfig } from '../server/config.js';
import { LocalRepository } from '../server/repository.js';
import { hashPassword } from '../server/password.js';
import { english } from '../shared/messages.js';
import { translate, resolveLocale, type Locale } from '../shared/i18n.js';

export function cliLocale(args = process.argv.slice(2), env = process.env): Locale {
  const index = args.indexOf('--lang');
  if (index >= 0) {
    if (!['en', 'zh', 'zh-CN'].includes(args[index + 1])) throw new Error('Use --lang en or --lang zh-CN.');
    return args[index + 1] === 'en' ? 'en' : 'zh-CN';
  }
  return resolveLocale([(env.LC_ALL || env.LC_MESSAGES || env.LANG || '').split('.')[0].replaceAll('_', '-')]);
}
export function commandLocale(): Locale {
  try { return cliLocale(); }
  catch {
    console.error('Use --lang en or --lang zh-CN. / 请使用 --lang en 或 --lang zh-CN。');
    process.exit(1);
  }
}
export function configurationError(error: unknown, locale: Locale): string {
  // Never print arbitrary exception messages: URLs and parser errors can include credentials.
  const key = error instanceof Error ? error.message : '';
  return Object.hasOwn(english, key) ? translate(key, locale) : locale === 'en'
    ? 'Configuration is invalid. Check URL formats and the configuration reference in docs/setup.md.'
    : '配置无效。请检查网址格式，并参照 docs/setup.md 的配置说明。';
}
export async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
export async function localSiteProblem(root: string): Promise<string | null> {
  const repo = new LocalRepository(resolve(root));
  for (const name of ['config.toml', 'data.toml']) {
    try { const file = await repo.read(name); if (!file) return name; parse(file.text); }
    catch { return name; }
  }
  try { const info = await lstat(join(root, 'content')); if (!info.isDirectory() || info.isSymbolicLink()) return 'content/'; }
  catch { return 'content/'; }
  return null;
}
export interface SetupInput {
  origin: string; siteRoot?: string; username: string; password: string;
  git?: { url: string; branch: string; username: string; token: string };
}
export async function makeSetupEnvironment(input: SetupInput): Promise<Record<string, string>> {
  const username = input.username.trim();
  if (!username || /[\x00-\x1f\x7f]/.test(username)) throw new Error('请输入账号和密码');
  const env: Record<string, string> = {
    STUDIO_ORIGIN: input.origin, STUDIO_STATE: 'file', STUDIO_STATE_DIR: '.state',
    STUDIO_SESSION_SECRET: randomBytes(32).toString('hex'), STUDIO_ADMIN_USER: username,
    STUDIO_ADMIN_PASSWORD_HASH: await hashPassword(input.password),
  };
  if (input.git) Object.assign(env, {
    STUDIO_GIT_URL: input.git.url, STUDIO_GIT_BRANCH: input.git.branch,
    STUDIO_GIT_USERNAME: input.git.username, STUDIO_GIT_TOKEN: input.git.token,
    STUDIO_GIT_AUTHOR: 'Creator Studio', STUDIO_GIT_EMAIL: 'studio@localhost',
  });
  else env.STUDIO_SITE_ROOT = resolve(input.siteRoot || '..');
  inspectConfig(env);
  return env;
}
export function serializeEnvironment(env: Record<string, string>): string {
  return '# Creator Studio — generated locally. Keep this file private.\n' + Object.entries(env).map(([key, value]) => {
    if (!/^STUDIO_[A-Z_]+$/.test(key) || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Unsupported environment value.');
    // Node dotenv supports quoted values without shell interpolation. Preserve literal $ and #.
    const quote = ["'", '`', '"'].find(mark => !value.includes(mark) && parseEnv(`${key}=${mark}${value}${mark}`)[key] === value);
    if (!quote) throw new Error('Unsupported environment value.');
    return `${key}=${quote}${value}${quote}`;
  }).join('\n') + '\n';
}
export async function writeNewEnvironment(path: string, env: Record<string, string>): Promise<void> {
  await writeFile(path, serializeEnvironment(env), { flag: 'wx', mode: 0o600 });
}
export interface Diagnostic { status: 'pass' | 'warn' | 'fail'; en: string; zh: string }
export async function diagnose(env: NodeJS.ProcessEnv, connect = false): Promise<Diagnostic[]> {
  const items: Diagnostic[] = [];
  const add = (status: Diagnostic['status'], en: string, zh: string) => items.push({ status, en, zh });
  let parsed: ReturnType<typeof inspectConfig>;
  try { parsed = inspectConfig(env); }
  catch (error) { return [{ status: 'fail', en: configurationError(error, 'en'), zh: configurationError(error, 'zh-CN') }]; }
  add('pass', 'Authentication and environment configuration are valid.', '认证和环境配置格式正确。');
  if (parsed.config.oidc) add('warn', 'OIDC sign-in is not tested here. Verify the callback URL and allowed subjects with a real login.', 'OIDC 登录尚未验证，请通过实际登录检查回调地址和管理员白名单。');
  if (parsed.stateMode === 'blob') {
    add(parsed.config.secureCookies ? 'warn' : 'fail', 'Blob needs HTTPS and Makers runtime credentials. Verify login/logout after deployment.', 'Blob 需要 HTTPS 和 Makers 运行时凭据，请部署后验证登录与退出。');
  } else {
    add('warn', 'File sessions need persistent disk on one server. Use Blob for Makers.', '文件会话需要单机持久磁盘；Makers 应使用 Blob。');
  }
  if (parsed.repository.mode === 'local') {
    const root = (parsed.repository as LocalRepository).root;
    const problem = await localSiteProblem(root);
    if (problem) add('fail', `${problem} is missing, invalid or unreadable. Set STUDIO_SITE_ROOT to the site root.`, `${problem} 缺失、格式无效或无法读取。请将 STUDIO_SITE_ROOT 指向站点根目录。`);
    else add('pass', 'config.toml, data.toml and content/ are readable.', 'config.toml、data.toml 和 content/ 可读取。');
    try { await access(root, constants.W_OK); add('pass', 'The site directory permits writes; individual file permissions are checked when saving.', '站点目录允许写入；各文件权限会在保存时检查。'); }
    catch { add('fail', 'The site directory is not writable. Check its permissions.', '站点目录不可写，请检查目录权限。'); }
    let ignored = '';
    try { ignored = await readFile(join(root, '.gitignore'), 'utf8'); } catch { /* An unversioned site may not have an ignore file. */ }
    if (!['.studio-history/', '.studio-write-lock/'].every(name => ignored.split(/\r?\n/).some(line => [name, '/' + name].includes(line.trim())))) add('warn', 'Add .studio-history/ and .studio-write-lock/ to the content repository .gitignore.', '请在内容仓库 .gitignore 加入 .studio-history/ 和 .studio-write-lock/。');
  } else {
    if (!env.STUDIO_GIT_TOKEN) add('warn', 'No Git token is configured. Reading a public repository does not grant write access.', '未配置 Git token。公开仓库可读取不代表能够推送。');
    if (!connect) add('warn', 'Git connection is not tested. Run npm run doctor -- --connect for a read-only check.', '尚未检查 Git 连接。运行 npm run doctor -- --connect 进行只读检查。');
    else {
      try {
        for (const path of ['config.toml', 'data.toml']) {
          const file = await parsed.repository.read(path);
          if (!file) throw new Error('Missing site file');
          parse(file.text);
        }
        add('pass', 'The configured Git branch and site TOML files are readable.', '配置的 Git 分支和站点 TOML 文件可读取。');
      } catch { add('fail', 'Git/site read failed. Check network, final HTTPS clone URL, token, branch and TOML files.', 'Git 或站点读取失败，请检查网络、最终 HTTPS 克隆地址、token、分支和 TOML 文件。'); }
    }
    add('warn', 'Push permission and site deployment are not tested. Save a test draft and check your CI after setup.', '尚未验证推送权限和主站部署；配置完成后请保存测试草稿并检查 CI。');
  }
  return items;
}
