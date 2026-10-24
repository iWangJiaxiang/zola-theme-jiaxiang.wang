import { resolve } from 'node:path';
import { LocalRepository, type Repository } from './repository.js';
import { GitRepository } from './git-repository.js';
import { FileState, BlobState, type StateStore } from './state.js';

export interface OidcSettings { issuer: string; clientId: string; clientSecret?: string; subjects: string[]; label: string }
export interface StudioConfig {
  origin: string; secureCookies: boolean; sessionSecret: string; sessionSeconds: number;
  username?: string; passwordHash?: string; oidc?: OidcSettings;
}
export function inspectConfig(env: NodeJS.ProcessEnv = process.env): { config: StudioConfig; repository: Repository; stateMode: 'file' | 'blob'; stateDirectory: string } {
  const origin = new URL(env.STUDIO_ORIGIN || 'http://localhost:5173');
  if (origin.origin !== origin.href.replace(/\/$/, '') || origin.username || origin.password) throw new Error('STUDIO_ORIGIN 必须为不含路径的 origin');
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))) throw new Error('非本机地址必须使用 HTTPS');
  const secret = env.STUDIO_SESSION_SECRET || '';
  if (secret.length < 32) throw new Error('请配置至少 32 字符的 STUDIO_SESSION_SECRET');
  const username = env.STUDIO_ADMIN_USER, passwordHash = env.STUDIO_ADMIN_PASSWORD_HASH;
  if ((username || passwordHash) && (!username || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash || ''))) throw new Error('请完整配置管理员账号和 scrypt 密码哈希');
  let oidc: OidcSettings | undefined;
  if (env.STUDIO_OIDC_ISSUER) {
    const issuer = new URL(env.STUDIO_OIDC_ISSUER);
    if (issuer.protocol !== 'https:') throw new Error('OIDC issuer 必须使用 HTTPS');
    const subjects = (env.STUDIO_OIDC_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!env.STUDIO_OIDC_CLIENT_ID || !subjects.length) throw new Error('OIDC 需要 client ID 和明确的 subject 白名单');
    oidc = { issuer: env.STUDIO_OIDC_ISSUER, clientId: env.STUDIO_OIDC_CLIENT_ID,
      clientSecret: env.STUDIO_OIDC_CLIENT_SECRET, subjects, label: env.STUDIO_OIDC_LABEL || '统一身份登录' };
  }
  if (!username && !oidc) throw new Error('至少启用账号密码或 OIDC 认证之一');
  const repository = env.STUDIO_GIT_URL ? new GitRepository({ url: env.STUDIO_GIT_URL, branch: env.STUDIO_GIT_BRANCH || 'master',
    username: env.STUDIO_GIT_USERNAME || 'x-access-token', token: env.STUDIO_GIT_TOKEN || '',
    name: env.STUDIO_GIT_AUTHOR || 'Creator Studio', email: env.STUDIO_GIT_EMAIL || 'studio@localhost' })
    : new LocalRepository(resolve(env.STUDIO_SITE_ROOT || '..'));
  if (env.STUDIO_STATE === 'blob' && repository.mode !== 'git') throw new Error('Makers 部署必须配置 Git 仓库，不能保存到临时文件系统');
  if (env.STUDIO_STATE && !['file', 'blob'].includes(env.STUDIO_STATE)) throw new Error('STUDIO_STATE 必须是 file 或 blob');
  return { config: { origin: origin.origin, secureCookies: origin.protocol === 'https:', sessionSecret: secret,
    sessionSeconds: 8 * 3600, username, passwordHash, oidc }, repository, stateMode: env.STUDIO_STATE === 'blob' ? 'blob' : 'file', stateDirectory: resolve(env.STUDIO_STATE_DIR || '.state') };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): { config: StudioConfig; repository: Repository; state: StateStore } {
  const { config, repository, stateMode, stateDirectory } = inspectConfig(env);
  return { config, repository, state: stateMode === 'blob' ? new BlobState() : new FileState(stateDirectory) };
}
