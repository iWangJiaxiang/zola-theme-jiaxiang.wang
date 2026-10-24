import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Identity } from '../shared/types.js';
import type { StudioConfig } from './config.js';
import type { StateStore } from './state.js';
import { StudioError } from './errors.js';

export interface Session { identity: Identity; csrf: string; expires: number }
const randomToken = () => randomBytes(32).toString('base64url');
export class Authentication {
  constructor(public config: StudioConfig, public state: StateStore) {}
  private key(token: string) { return `sessions/${createHmac('sha256', this.config.sessionSecret).update(`${this.config.passwordHash || ''}:${token}`).digest('hex')}`; }
  cookieName() { return this.config.secureCookies ? '__Host-studio-session' : 'studio-session'; }
  async create(c: Context, identity: Identity): Promise<Session> {
    const oldToken = getCookie(c, this.cookieName());
    if (oldToken) await this.state.delete(this.key(oldToken));
    const token = randomToken();
    const session = { identity, csrf: randomToken(), expires: Date.now() + this.config.sessionSeconds * 1000 };
    await this.state.set(this.key(token), session);
    setCookie(c, this.cookieName(), token, { path: '/', httpOnly: true, secure: this.config.secureCookies, sameSite: 'Lax', maxAge: this.config.sessionSeconds });
    return session;
  }
  async read(c: Context): Promise<Session | null> {
    const token = getCookie(c, this.cookieName());
    if (!token || !/^[\w-]{43}$/.test(token)) return null;
    const session = await this.state.get<Session>(this.key(token));
    if (!session) return null;
    if (session.expires <= Date.now()) { await this.state.delete(this.key(token)); return null; }
    // Changes to the administrator allowlist take effect without waiting for expiry.
    const allowed = session.identity.method === 'password' ? this.config.username === session.identity.id && !!this.config.passwordHash
      : !!this.config.oidc?.subjects.some(sub => `${this.config.oidc!.issuer}|${sub}` === session.identity.id);
    return allowed ? session : null;
  }
  async revoke(c: Context): Promise<void> {
    const token = getCookie(c, this.cookieName());
    if (token) await this.state.delete(this.key(token));
    deleteCookie(c, this.cookieName(), { path: '/', secure: this.config.secureCookies });
  }
  checkOrigin(c: Context) {
    if (c.req.header('origin') !== this.config.origin) throw new StudioError(403, '请求来源不匹配');
  }
  checkCsrf(c: Context, session: Session) {
    this.checkOrigin(c);
    const received = Buffer.from(c.req.header('x-csrf-token') || '');
    const expected = Buffer.from(session.csrf);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new StudioError(403, '请求校验失败，请刷新后重试');
  }
}
