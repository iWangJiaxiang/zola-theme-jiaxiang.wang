import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { commandLocale, configurationError, exists, localSiteProblem, makeSetupEnvironment, writeNewEnvironment } from './setup-support.js';

const locale = commandLocale();
const say = (en: string, zh: string) => locale === 'en' ? en : zh;
const destination = resolve('.env');
async function main() {
  if (await exists(destination)) {
    console.log(say('.env already exists and was left unchanged. Run npm run doctor; see docs/setup.md to update it.', '.env 已存在，已保留原配置。运行 npm run doctor 检查；修改方法见 docs/setup.md。'));
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(say('An interactive terminal is required. Run npm run setup in your terminal.', '需要交互式终端，请在自己的终端运行 npm run setup。'));
    process.exitCode = 1;
    return;
  }
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stdout.write(chunk); done(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  let cancelled = false;
  const controller = new AbortController();
  const cancel = () => { cancelled = true; controller.abort(); };
  prompt.on('SIGINT', cancel);
  const ask = async (en: string, zh: string, fallback = '', hidden = false) => {
    process.stdout.write(say(en, zh) + (fallback ? ` [${fallback}]` : '') + ': ');
    muted = hidden;
    try {
      const value = await prompt.question('', { signal: controller.signal });
      if (cancelled) throw new Error('Cancelled');
      return (hidden ? value : value.trim()) || fallback;
    } finally { muted = false; if (hidden) process.stdout.write('\n'); }
  };
  try {
    console.log(say('Creator Studio setup · Ctrl+C cancels without saving. Passwords and tokens are hidden.', '创作中心首次设置 · Ctrl+C 取消，不写入配置。密码与 token 输入不回显。'));
    let mode = '';
    while (!['1', '2'].includes(mode)) mode = await ask('Content source: 1 local site, 2 HTTPS Git', '内容来源：1 本地站点，2 HTTPS Git', '1');
    let siteRoot: string | undefined;
    let git: { url: string; branch: string; username: string; token: string } | undefined;
    if (mode === '1') {
      const suggested = !(await localSiteProblem(resolve('../../..'))) ? '../../..' : '..';
      while (true) {
        siteRoot = resolve(await ask('Site root (contains config.toml, data.toml, content/)', '站点根目录（含 config.toml、data.toml、content/）', suggested));
        const problem = await localSiteProblem(siteRoot);
        if (!problem) break;
        console.log(say(`Cannot read valid ${problem}. Select the site folder, not studio/.`, `无法读取有效的 ${problem}。请选择站点目录，不是 studio/。`));
      }
    } else {
      const url = await ask('Final HTTPS clone URL (no embedded credentials)', '最终 HTTPS 克隆地址（不含账号密码）');
      const branch = await ask('Existing content branch', '已有的内容分支', 'main');
      let defaultUser = 'x-access-token';
      try { if (new URL(url).hostname === 'cnb.cool') defaultUser = 'cnb'; } catch { /* Validation below reports a safe message. */ }
      const username = await ask('Git HTTPS username', 'Git HTTPS 用户名', defaultUser);
      const token = await ask('Git access token (hidden)', 'Git 访问令牌（输入隐藏）', '', true);
      git = { url, branch, username, token };
    }
    const origin = await ask('Local Studio URL', '本地后台地址', 'http://localhost:5173');
    const originURL = new URL(origin);
    if (originURL.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(originURL.hostname)) {
      console.log(say('Use http://localhost:<port> for setup. Configure the public HTTPS origin later using docs/setup.md.', '首次设置请使用 http://localhost:<端口>；正式 HTTPS 域名请稍后按 docs/setup.md 配置。'));
      process.exitCode = 1;
      return;
    }
    const username = await ask('Studio admin username (separate from Git)', '后台管理员账号（与 Git 账号独立）', 'owner');
    let password = '';
    while (true) {
      password = await ask('Admin password (at least 12 characters)', '管理员密码（至少 12 个字符）', '', true);
      const repeat = await ask('Repeat password', '再次输入密码', '', true);
      if (password !== repeat) console.log(say('Passwords do not match. Try again.', '两次密码不一致，请重试。'));
      else if (password.length < 12 || Buffer.byteLength(password) > 1024) console.log(say('Use at least 12 characters and no more than 1024 bytes.', '密码至少 12 个字符，最多 1024 字节。'));
      else break;
    }
    const env = await makeSetupEnvironment({ origin, username, password, siteRoot, git });
    password = '';
    if (cancelled) return;
    await writeNewEnvironment(destination, env);
    console.log(say('\nCreated private .env with a password hash and random session secret. No site files were changed.', '\n已创建私有 .env，保存密码哈希并生成随机会话密钥。未修改站点文件。'));
    console.log(say('Next: npm run doctor → npm run dev. Open ', '下一步：npm run doctor → npm run dev。浏览器打开 ') + env.STUDIO_ORIGIN);
    console.log(say('Use your Studio admin username and password to sign in. Guide: docs/quick-start.en.md', '使用刚设置的后台账号和密码登录。入门文档：docs/quick-start.zh-CN.md'));
    if (git) console.log(say('Run npm run doctor -- --connect to verify repository reads; this does not test push permissions.', '运行 npm run doctor -- --connect 检查仓库读取；不会测试推送权限。'));
  } catch (error) {
    if (!cancelled) throw error;
    console.log(say('\nSetup cancelled. No configuration was saved.', '\n已取消设置，未保存配置。'));
  } finally { prompt.close(); }
}
try { await main(); }
catch (error) {
  console.error(say('Setup did not complete. Existing files were not overwritten. ', '设置未完成，已有文件未被覆盖。 ') + configurationError(error, locale));
  process.exitCode = 1;
}
