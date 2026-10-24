import { commandLocale, diagnose } from './setup-support.js';
const locale = commandLocale();
console.log(locale === 'en' ? 'Creator Studio diagnostics · read-only; no saves or pushes.' : '创作中心配置检查 · 只读，不保存内容或推送 Git。');
const diagnostics = await diagnose(process.env, process.argv.includes('--connect'));
for (const item of diagnostics) console.log(`[${item.status.toUpperCase()}] ${locale === 'en' ? item.en : item.zh}`);
if (diagnostics.some(item => item.status === 'fail')) {
  process.exitCode = 1;
  console.log(locale === 'en' ? 'Fix the failed checks, then rerun this command. New installation: npm run setup. Help: docs/setup.md.' : '请修复失败项后重新检查。首次安装：npm run setup。排查文档：docs/setup.md。');
} else console.log(locale === 'en' ? 'Configuration checks passed. Warnings above still need your review. Start with npm run dev.' : '配置检查通过，请留意上面的待确认项。运行 npm run dev 启动。');
