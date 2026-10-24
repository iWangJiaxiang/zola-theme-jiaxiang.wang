import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../server/password.js';
import { commandLocale, configurationError } from './setup-support.js';
const locale = commandLocale();
const say = (en: string, zh: string) => locale === 'en' ? en : zh;
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(say('Run npm run password in an interactive terminal. Do not pass passwords as command arguments.', '请在交互式终端运行 npm run password，不要通过命令参数传入密码。'));
    process.exitCode = 1;
    return;
  }
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  const controller = new AbortController();
  prompt.on('SIGINT', () => controller.abort());
  try {
    process.stdout.write(say('Admin password (at least 12 characters, hidden): ', '设置管理员密码（至少 12 字符，输入不回显）：')); muted = true;
    const password = await prompt.question('', { signal: controller.signal });
    process.stdout.write(say('\nRepeat password: ', '\n再次输入：'));
    const confirmation = await prompt.question('', { signal: controller.signal });
    process.stdout.write('\n');
    if (password !== confirmation) {
      console.error(say('Passwords do not match. Run npm run password again.', '两次密码不一致，请重新运行 npm run password。'));
      process.exitCode = 1;
      return;
    }
    console.log(`STUDIO_ADMIN_PASSWORD_HASH='${await hashPassword(password)}'`);
    console.log(say('Replace the hash in your server configuration, then restart. This command does not edit .env.', '将哈希替换到服务端配置后重启。此命令不会修改 .env。'));
  } catch (error) {
    if (!controller.signal.aborted) throw error;
    console.log(say('\nCancelled.', '\n已取消。'));
  } finally { muted = false; prompt.close(); }
}
try { await main(); }
catch (error) { console.error(configurationError(error, locale)); process.exitCode = 1; }
