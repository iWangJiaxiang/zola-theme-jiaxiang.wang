import * as oidc from 'openid-client';
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomBytes, createHash } from 'node:crypto';
import type { Identity } from '../shared/types.js';
import { Authentication } from './auth.js';
import { StudioError } from './errors.js';

interface Pending { state: string; nonce: string; verifier: string; binding: string; expires: number }
export class OidcAuthentication {
  private discovery?: Promise<oidc.Configuration>;
  constructor(private auth: Authentication, private discover?: () => Promise<oidc.Configuration>) {}
  private async client() {
    const settings = this.auth.config.oidc;
    if (!settings) throw new StudioError(404, '未启用 OIDC 登录');
    if (!this.discovery) this.discovery = (this.discover ? this.discover() : oidc.discovery(new URL(settings.issuer), settings.clientId, settings.clientSecret))
      .then(config => { oidc.enableNonRepudiationChecks(config); return config; })
      .catch(error => { this.discovery = undefined; throw error; });
    return this.discovery;
  }
  private callback() { return `${this.auth.config.origin}/api/auth/oidc/callback`; }
  async start(c: Context): Promise<string> {
    const config = await this.client();
    const pending: Pending = { state: oidc.randomState(), nonce: oidc.randomNonce(), verifier: oidc.randomPKCECodeVerifier(),
      binding: randomBytes(32).toString('base64url'), expires: Date.now() + 10 * 60_000 };
    await this.auth.state.set(`oidc/${pending.state}`, pending);
    setCookie(c, 'studio-oidc', createHash('sha256').update(pending.binding).digest('hex'), {
      path: '/api/auth/oidc', httpOnly: true, secure: this.auth.config.secureCookies, sameSite: 'Lax', maxAge: 600 });
    return oidc.buildAuthorizationUrl(config, { redirect_uri: this.callback(), scope: 'openid profile',
      state: pending.state, nonce: pending.nonce, code_challenge: await oidc.calculatePKCECodeChallenge(pending.verifier), code_challenge_method: 'S256' }).href;
  }
  async finish(c: Context): Promise<Identity> {
    const state = c.req.query('state');
    if (!state || !/^[\w-]{20,128}$/.test(state)) throw new StudioError(400, '登录状态无效，请重新登录');
    const pending = await this.auth.state.get<Pending>(`oidc/${state}`);
    const binding = getCookie(c, 'studio-oidc');
    if (!pending || pending.expires < Date.now() || !binding || binding !== createHash('sha256').update(pending.binding).digest('hex')) throw new StudioError(400, '登录状态已过期或不属于当前浏览器');
    await this.auth.state.delete(`oidc/${state}`);
    deleteCookie(c, 'studio-oidc', { path: '/api/auth/oidc', secure: this.auth.config.secureCookies });
    const url = new URL(this.callback());
    url.search = new URL(c.req.url).search;
    const tokens = await oidc.authorizationCodeGrant(await this.client(), url, { expectedState: pending.state,
      expectedNonce: pending.nonce, pkceCodeVerifier: pending.verifier, idTokenExpected: true });
    const claims = tokens.claims();
    const settings = this.auth.config.oidc!;
    if (!claims || claims.iss !== settings.issuer || !settings.subjects.includes(claims.sub)) throw new StudioError(403, '此身份没有管理权限');
    return { id: `${claims.iss}|${claims.sub}`, name: typeof claims.name === 'string' ? claims.name : claims.sub, method: 'oidc' };
  }
}
