const crypto = require('crypto');
const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope } = require('../auth/jwt');
const { NODE_ENV, KINN_OAUTH_RELAY_SECRET } = require('../config/env');
const Workspace = require('../db/models/workspace.model');
const WorkspaceMembership = require('../db/models/workspace-membership.model');
const Provider = require('../db/models/provider.model');
const OAuthPendingFlow = require('../db/models/oauth-pending-flow.model');
const { signOauthState, verifyOauthState } = require('../oauth/state');
const {
  buildOAuth2AuthorizationUrl,
  buildTokenRequest,
  buildUserInfoRequest,
  computeRedirectUri,
  createOAuth2PkcePair,
  getProviderOAuth2Config,
  normalizeOAuth2CredentialValues,
  resolveOAuth2Environment,
} = require('../oauth/provider-auth');

function originOf(req) {
  // Respecte le proxy (Traefik) : X-Forwarded-Proto/Host.
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function isHttpsUrl(url) {
  try { return new URL(String(url || '')).protocol === 'https:'; } catch { return false; }
}
function isHttpUrl(url) {
  try { const p = new URL(String(url || '')).protocol; return p === 'http:' || p === 'https:'; } catch { return false; }
}

function cookieName(vendor) {
  return `oauth_nonce_${String(vendor || '').replace(/[^a-z0-9_]/gi, '')}`;
}
function readCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

async function resolveWorkspace(wsId, user) {
  const raw = String(wsId || '').trim();
  if (!raw) return null;
  let ws = null;
  if (Types.ObjectId.isValid(raw)) ws = await Workspace.findById(raw);
  if (!ws) ws = await Workspace.findOne({ id: raw });
  if (!ws) return null;
  if (String(ws.companyId) !== String(user?.companyId || '')) return null;
  const member = await WorkspaceMembership.findOne({ userId: user.id, workspaceId: ws._id });
  return member ? ws : null;
}

function escapeJsonForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderPopupResult(res, { success, origin, state, payload, error, providerTitle }) {
  const safeOrigin = typeof origin === 'string' ? origin : '';
  const label = String(providerTitle || 'OAuth2').trim() || 'OAuth2';
  const message = {
    type: 'kinn:provider-auth:result',
    state: String(state || ''),
    success: !!success,
    payload: payload || null,
    error: error || null,
  };
  const serialized = escapeJsonForInlineScript(message);
  const title = success ? `Connexion ${label} terminée` : `Connexion ${label} échouée`;
  const body = success
    ? `La connexion ${label} est terminée. Cette fenêtre peut être fermée.`
    : String(error?.message || `La connexion ${label} a échoué.`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px}.card{max-width:560px;margin:10vh auto 0;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,.08)}h1{font-size:20px;margin:0 0 12px}p{margin:0;color:#475569;line-height:1.5}</style>
</head><body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></div>
<script>(function(){var targetOrigin=${escapeJsonForInlineScript(safeOrigin)};var message=${serialized};try{if(window.opener&&!window.opener.closed&&targetOrigin){window.opener.postMessage(message,targetOrigin);window.close();return;}}catch(_){}})();</script>
</body></html>`);
}

module.exports = function () {
  const r = express.Router();

  // ─────────────────────────────────────────────────────────────────────────
  // PREPARE — démarre un flow : signe le state, stocke le pending, pose le cookie CSRF.
  // ─────────────────────────────────────────────────────────────────────────
  r.post('/api/auth/connections/prepare', authMiddleware(), requireCompanyScope(), async (req, res) => {
    if (req.ctx?.useMemory) return res.apiError(501, 'not_implemented', 'OAuth connections are not available in memory mode');

    const body = req.body || {};
    const providerKey = String(body.providerKey || '').trim();
    const frontendOrigin = String(body.frontendOrigin || req.headers.origin || '').trim();
    if (!providerKey) return res.apiError(400, 'missing_provider_key', 'Missing provider key');
    if (!frontendOrigin || !isHttpUrl(frontendOrigin)) {
      return res.apiError(400, 'invalid_frontend_origin', 'Frontend origin must be a valid http(s) origin');
    }

    const provider = await Provider.findOne({ key: providerKey, enabled: true }).lean();
    const oauth2 = getProviderOAuth2Config(provider);
    if (!oauth2) return res.apiError(400, 'unsupported_provider_auth', 'Provider does not support OAuth2 connections');

    if (oauth2.useBouncer && !String(KINN_OAUTH_RELAY_SECRET || '').trim()) {
      return res.apiError(500, 'oauth2_relay_secret_missing', 'KINN_OAUTH_RELAY_SECRET is not configured');
    }

    const env = resolveOAuth2Environment(oauth2);
    if (!env.clientId || !env.clientSecret) {
      return res.apiError(500, 'oauth2_not_configured', 'OAuth2 client ID/secret are not configured');
    }

    const ws = await resolveWorkspace(body.workspaceId, req.user);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    const returnOrigin = originOf(req);
    const redirectUri = computeRedirectUri({ config: oauth2, returnOrigin });
    if (!isHttpUrl(redirectUri)) {
      return res.apiError(500, 'oauth2_invalid_redirect_uri', 'OAuth2 redirect URI must be a valid http(s) URL');
    }
    if (NODE_ENV === 'production') {
      if (!isHttpsUrl(redirectUri)) return res.apiError(500, 'oauth2_insecure_redirect_uri', 'OAuth2 redirect URI must use HTTPS in production');
      if (!isHttpsUrl(frontendOrigin)) return res.apiError(400, 'oauth2_insecure_frontend_origin', 'Frontend origin must use HTTPS in production');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const pkce = oauth2.pkce ? createOAuth2PkcePair(oauth2) : null;

    // Store serveur-side (Mongo TTL). codeVerifier reste ICI, jamais dans le state.
    await OAuthPendingFlow.create({
      nonce,
      vendor: oauth2.vendor,
      providerKey,
      providerTitle: String(provider?.title || provider?.name || providerKey),
      codeVerifier: pkce?.codeVerifier || null,
      workspaceId: ws._id,
      userId: String(req.user.id || ''),
      companyId: String(req.user.companyId || ''),
      frontendOrigin,
    });

    // State signé HS256 (routage only). Vérifié par le bouncer ET re-vérifié au callback.
    // `provider` est un ALIAS de `vendor` (même valeur) : le bouncer Panel lit
    // selon les versions soit `claims.provider` soit `claims.vendor` → on met les
    // deux pour garantir l'interop du check « provider URL == JWT claim ».
    const state = signOauthState({ returnOrigin, vendor: oauth2.vendor, provider: oauth2.vendor, providerKey, nonce });

    // Cookie anti-CSRF (httpOnly). SameSite=Lax → renvoyé sur la navigation top-level GET du callback.
    res.cookie(cookieName(oauth2.vendor), nonce, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });

    const authorizeUrl = buildOAuth2AuthorizationUrl({
      config: oauth2,
      clientId: env.clientId,
      redirectUri,
      state,
      codeChallenge: pkce?.codeChallenge,
      codeChallengeMethod: pkce?.codeChallengeMethod,
    });

    return res.apiOk({
      authorizeUrl,
      // Origin qui émettra le postMessage final (= cette instance, le bouncer relaie vers elle).
      callbackOrigin: returnOrigin,
      providerKey,
      vendor: oauth2.vendor,
      authType: 'oauth2',
      // State (JWT signé, non sensible) renvoyé pour corréler le postMessage côté front.
      state,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISCOVERY — quels providers OAuth2 sont CONNECTABLES MAINTENANT (env prêt) ?
  // Permet au front de n'afficher « Se connecter » que si l'app OAuth est
  // réellement configurée (client_id/secret injectés + concentrateur set),
  // plutôt que de se fier au seul bloc `auth` du manifest.
  // ─────────────────────────────────────────────────────────────────────────
  r.get('/api/auth/connections/available', authMiddleware(), requireCompanyScope(), async (req, res) => {
    if (req.ctx?.useMemory) return res.apiOk({ providers: [] });

    const relayReady = !!String(KINN_OAUTH_RELAY_SECRET || '').trim();
    const providers = await Provider.find({ enabled: true, 'auth.type': 'oauth2' }).lean();
    const available = [];
    for (const provider of (providers || [])) {
      const oauth2 = getProviderOAuth2Config(provider);
      if (!oauth2) continue;
      // Le bouncer exige le secret de relais partagé.
      if (oauth2.useBouncer && !relayReady) continue;
      const env = resolveOAuth2Environment(oauth2);
      if (!env.clientId || !env.clientSecret) continue; // app OAuth non configurée → on masque
      available.push({
        providerKey: provider.key,
        vendor: oauth2.vendor,
        displayName: String(provider.title || provider.name || provider.key),
        iconClass: provider.iconClass || undefined,
        iconUrl: provider.iconUrl || undefined,
        useBouncer: oauth2.useBouncer,
      });
    }
    return res.apiOk({ providers: available });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CALLBACK — relayé par le bouncer (302). DOIT re-vérifier la signature du state.
  // ─────────────────────────────────────────────────────────────────────────
  r.get('/oauth/:vendor/callback', async (req, res) => {
    const vendor = String(req.params.vendor || '').toLowerCase();

    if (req.ctx?.useMemory) {
      return renderPopupResult(res, { success: false, error: { code: 'not_implemented', message: 'OAuth connections are not available in memory mode' } });
    }

    const code = String(req.query.code || '').trim();
    const stateRaw = String(req.query.state || '').trim();
    const oauthError = String(req.query.error || '').trim();
    const oauthErrorDescription = String(req.query.error_description || '').trim();

    // (1) Vérification SIGNÉE du state (signature + exp). Ferme le callback direct forgé.
    let claims;
    try {
      claims = verifyOauthState(stateRaw);
    } catch (e) {
      return renderPopupResult(res, { success: false, state: stateRaw, error: { code: e.message || 'state_invalid', message: 'OAuth state is missing, invalid or expired' } });
    }

    // (2) Cross-vendor : le vendor du path doit matcher celui signé dans le state.
    // Tolérant : accepte `vendor` ou son alias `provider`.
    const claimVendor = String(claims.vendor || claims.provider || '').toLowerCase();
    if (claimVendor !== vendor) {
      return renderPopupResult(res, { success: false, origin: claims.returnOrigin, state: stateRaw, error: { code: 'vendor_mismatch', message: 'Unexpected OAuth vendor' } });
    }

    // (3) Anti-CSRF : cookie nonce == state nonce.
    const cookieNonce = readCookie(req, cookieName(vendor));
    res.clearCookie(cookieName(vendor), { path: '/' });
    if (!cookieNonce || cookieNonce !== claims.nonce) {
      return renderPopupResult(res, { success: false, origin: claims.returnOrigin, state: stateRaw, error: { code: 'csrf_nonce_mismatch', message: 'OAuth CSRF check failed' } });
    }

    // (4) Pending flow (usage unique).
    const flow = await OAuthPendingFlow.findOneAndDelete({ nonce: claims.nonce });
    if (!flow) {
      return renderPopupResult(res, { success: false, origin: claims.returnOrigin, state: stateRaw, error: { code: 'flow_unknown', message: 'OAuth flow is unknown or already consumed' } });
    }

    if (oauthError) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'oauth2_denied', message: oauthErrorDescription || oauthError } });
    }
    if (!code) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'missing_authorization_code', message: 'Missing OAuth2 authorization code' } });
    }

    // (5) Config provider résolue depuis providerKey (PAS depuis le vendor du path).
    const provider = await Provider.findOne({ key: flow.providerKey, enabled: true }).lean();
    const oauth2 = getProviderOAuth2Config(provider);
    if (!oauth2) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'provider_auth_missing', message: 'Provider OAuth2 configuration is missing' } });
    }

    const env = resolveOAuth2Environment(oauth2);
    if (!env.clientId || !env.clientSecret) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'oauth2_not_configured', message: 'OAuth2 backend configuration is incomplete' } });
    }

    // (6) Échange code → token. redirect_uri calculé par le MÊME helper que prepare.
    const redirectUri = computeRedirectUri({ config: oauth2, returnOrigin: claims.returnOrigin });
    let tokenData = null;
    try {
      const request = buildTokenRequest({
        config: oauth2,
        grantType: 'authorization_code',
        code,
        clientId: env.clientId,
        clientSecret: env.clientSecret,
        redirectUri,
        codeVerifier: flow.codeVerifier,
      });
      const tokenRes = await fetch(request.tokenUrl, { method: 'POST', headers: request.headers, body: request.body });
      tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.access_token) {
        const message = tokenData?.error_description || tokenData?.error || 'Failed to exchange authorization code';
        return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'token_exchange_failed', message } });
      }
    } catch (err) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'token_exchange_failed', message: err?.message || 'Failed to exchange authorization code' } });
    }

    if (oauth2.requireRefreshToken && !String(tokenData.refresh_token || '').trim()) {
      return renderPopupResult(res, { success: false, origin: flow.frontendOrigin, state: stateRaw, providerTitle: flow.providerTitle, error: { code: 'missing_refresh_token', message: 'OAuth2 provider did not return a refresh token. Retry the connection and confirm the consent screen.' } });
    }

    // userinfo (best-effort).
    let userInfo = {};
    try {
      const request = buildUserInfoRequest({ config: oauth2, accessToken: tokenData.access_token });
      if (request?.userinfoUrl) {
        const userRes = await fetch(request.userinfoUrl, { headers: request.headers });
        if (userRes.ok) userInfo = await userRes.json();
      }
    } catch {}

    const values = normalizeOAuth2CredentialValues({ providerKey: flow.providerKey, config: oauth2, tokenData, userInfo });

    return renderPopupResult(res, {
      success: true,
      origin: flow.frontendOrigin,
      state: stateRaw,
      providerTitle: flow.providerTitle,
      payload: {
        providerKey: flow.providerKey,
        workspaceId: String(flow.workspaceId),
        authType: 'oauth2',
        values,
      },
    });
  });

  return r;
};
