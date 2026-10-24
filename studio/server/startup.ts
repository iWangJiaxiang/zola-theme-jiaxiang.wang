import { loadConfig } from './config.js';
import { english } from '../shared/messages.js';
import { resolveLocale, translate } from '../shared/i18n.js';

export function loadStartupConfig(): ReturnType<typeof loadConfig> {
  try { return loadConfig(); }
  catch (error) {
    const locale = resolveLocale([(process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '').replaceAll('_', '-')]);
    const key = error instanceof Error ? error.message : '';
    // Only known configuration errors are safe to show; SDK failures can contain sensitive details.
    if (Object.hasOwn(english, key)) console.error(translate(key, locale));
    console.error(locale === 'en'
      ? 'Creator Studio could not start. For first use run npm run setup; for existing configuration run npm run doctor. See studio/docs/setup.md. On a deployed host, check its server environment variables.'
      : '创作中心未能启动。首次使用请运行 npm run setup；已有配置请运行 npm run doctor。参见 studio/docs/setup.md。部署环境请检查服务端环境变量。');
    process.exit(1);
  }
}
