// Routes SSO Zitadel : /api/auth/sso/{start,callback,refresh,logout}.
//
// Approche stateless : le state OIDC envoyé à Zitadel est un JWT signé avec
// HMAC_SECRET qui contient {code_verifier, nonce, redirect_after, iat}.
// Au callback, on vérifie le state, on extrait code_verifier+nonce et on
// échange le code. Pas de session DB ou cookie pour stocker l'ephemeral.

const express = require('express');
const env = require('../../config/env');
const { sign: signJwt } = require('../../auth/jwt');
const { makeToken, verifyToken, nowSec } = require('../../utils/crypto');
const { encrypt, decrypt } = require('../../utils/enc');
const User = require('../../db/models/user.model');
const Company = require('../../db/models/company.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Session = require('../../db/models/session.model');
const zitadel = require('../../services/sso/zitadel-client');
const { provisionFromClaims } = require('../../services/sso/jit-provisioner');

const SSO_STATE_TTL_SEC = 10 * 60; // 10 min : largement suffisant pour cliquer "Login"

function buildStateJwt({ code_verifier, nonce, redirectAfter }) {
  const iat = nowSec();
  return makeToken({
    code_verifier,
    nonce,
    redirectAfter: redirectAfter || null,
    iat,
    exp: iat + SSO_STATE_TTL_SEC,
  }, env.HMAC_SECRET);
}

function verifyStateJwt(stateJwt) {
  const payload = verifyToken(stateJwt, env.HMAC_SECRET);
  if (!payload || payload.exp < nowSec()) throw new Error('SSO state expired or invalid');
  return payload;
}

function ssoEnabled() {
  return env.SSO_MODE && env.SSO_MODE !== 'disabled' && !!env.ZITADEL_ISSUER && !!env.ZITADEL_CLIENT_ID;
}

module.exports = function() {
  const r = express.Router();

  // GET /api/auth/sso/status — utilisé par le frontend pour savoir si afficher le bouton SSO
  r.get('/sso/status', (req, res) => {
    res.apiOk({
      enabled: ssoEnabled(),
      mode: env.SSO_MODE,
      passwordLoginAllowed: env.SSO_MODE !== 'enforced',
    });
  });

  // GET /api/auth/sso/start — redirige vers Zitadel avec PKCE + state
  r.get('/sso/start', async (req, res) => {
    if (!ssoEnabled()) return res.status(404).json({ error: 'sso_disabled' });
    try {
      const { code_verifier, code_challenge, state: rawState, nonce, scopes } = zitadel.buildAuthRequest();
      const stateJwt = buildStateJwt({
        code_verifier,
        nonce,
        redirectAfter: String(req.query.redirect_after || '').slice(0, 200) || null,
      });
      const url = await zitadel.buildAuthorizationUrl({
        code_challenge,
        state: stateJwt,
        nonce,
        scopes,
      });
      res.redirect(url);
    } catch (e) {
      console.error('[sso] start failed:', e?.message);
      res.status(503).json({ error: 'sso_provider_unavailable', message: e?.message });
    }
  });

  // GET /api/auth/sso/callback — Zitadel renvoie ici avec ?code=&state=
  r.get('/sso/callback', async (req, res) => {
    if (!ssoEnabled()) return res.status(404).json({ error: 'sso_disabled' });
    try {
      const code = String(req.query.code || '');
      const stateJwt = String(req.query.state || '');
      if (!code || !stateJwt) return res.status(400).json({ error: 'missing_code_or_state' });

      // 1. Vérifie le state pour récupérer code_verifier + nonce
      let st;
      try { st = verifyStateJwt(stateJwt); }
      catch (e) { return res.status(400).json({ error: 'invalid_state', message: e.message }); }

      // 2. Échange du code contre les tokens (incl. id_token)
      const tokenSet = await zitadel.exchangeCode({
        code,
        code_verifier: st.code_verifier,
        state: stateJwt,
        nonce: st.nonce,
      });
      const claims = tokenSet.claims();

      // 3. Fallback /userinfo si rôles manquent dans l'ID token
      let mergedClaims = claims;
      try {
        if (!hasProjectRoles(claims)) {
          const userinfo = await zitadel.fetchUserinfo(tokenSet.access_token);
          mergedClaims = { ...claims, ...userinfo };
        }
      } catch (e) { /* fallback best-effort */ }

      // 4. JIT user
      const { user } = await provisionFromClaims(mergedClaims);

      // 5. Crée/maj la Session (refresh token chiffré)
      const session = await Session.create({
        userId: user._id,
        zitadelSub: String(user.zitadelSub || claims.sub),
        refreshTokenEnc: tokenSet.refresh_token ? encrypt({ t: tokenSet.refresh_token }) : null,
        accessTokenEnc: tokenSet.access_token ? encrypt({ t: tokenSet.access_token }) : null,
        idTokenEnc: tokenSet.id_token ? encrypt({ t: tokenSet.id_token }) : null,
        accessTokenExpiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : null,
        sessionVersion: user.sessionVersion || 0,
        ipAddress: req.ip,
        deviceInfo: String(req.headers['user-agent'] || '').slice(0, 200),
      });

      // 6. Émet le JWT Kinn interne
      const kinnJwt = signJwt({
        user: {
          id: String(user._id),
          email: user.email,
          role: user.localPromotion || user.role,
          companyId: String(user.companyId),
          sessionId: String(session._id),
          sessionVersion: user.sessionVersion || 0,
        },
      });

      // 7. Redirect vers le frontend (route /auth/sso/complete?token=...)
      const front = process.env.FRONTEND_BASE_URL || '';
      const targetPath = st.redirectAfter || '/';
      const redirectUrl = `${front}/auth/sso/complete?token=${encodeURIComponent(kinnJwt)}&redirect=${encodeURIComponent(targetPath)}`;
      res.redirect(redirectUrl);
    } catch (e) {
      console.error('[sso] callback failed:', e?.message);
      const front = process.env.FRONTEND_BASE_URL || '';
      const errMsg = encodeURIComponent(e?.message || 'sso_failure');
      res.redirect(`${front}/login?sso_error=${errMsg}`);
    }
  });

  // POST /api/auth/sso/refresh — rafraîchit l'access/id token via le refresh stocké
  r.post('/sso/refresh', async (req, res) => {
    if (!ssoEnabled()) return res.status(404).json({ error: 'sso_disabled' });
    try {
      const { sessionId } = req.body || {};
      if (!sessionId) return res.status(400).json({ error: 'session_id_required' });
      const session = await Session.findById(sessionId);
      if (!session) return res.status(404).json({ error: 'session_not_found' });
      if (!session.refreshTokenEnc) return res.status(400).json({ error: 'no_refresh_token' });

      const decrypted = decrypt(session.refreshTokenEnc);
      const refreshToken = decrypted?.t;
      const tokenSet = await zitadel.refreshTokens(refreshToken);

      session.refreshTokenEnc = tokenSet.refresh_token ? encrypt({ t: tokenSet.refresh_token }) : session.refreshTokenEnc;
      session.accessTokenEnc = tokenSet.access_token ? encrypt({ t: tokenSet.access_token }) : null;
      session.idTokenEnc = tokenSet.id_token ? encrypt({ t: tokenSet.id_token }) : session.idTokenEnc;
      session.accessTokenExpiresAt = tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : null;
      session.lastUsedAt = new Date();
      await session.save();

      // Re-émet aussi le JWT Kinn (au cas où le rôle a changé via Zitadel)
      const claims = tokenSet.claims();
      const { user } = await provisionFromClaims(claims);
      const kinnJwt = signJwt({
        user: {
          id: String(user._id),
          email: user.email,
          role: user.localPromotion || user.role,
          companyId: String(user.companyId),
          sessionId: String(session._id),
          sessionVersion: user.sessionVersion || 0,
        },
      });

      res.apiOk({ token: kinnJwt, expiresAt: session.accessTokenExpiresAt });
    } catch (e) {
      console.error('[sso] refresh failed:', e?.message);
      res.status(401).json({ error: 'refresh_failed', message: e?.message });
    }
  });

  // GET /api/auth/sso/logout — RP-initiated logout, redirige vers end_session Zitadel
  r.get('/sso/logout', async (req, res) => {
    if (!ssoEnabled()) return res.status(404).json({ error: 'sso_disabled' });
    try {
      const { sessionId } = req.query || {};
      let idTokenForHint = null;
      if (sessionId) {
        const session = await Session.findById(String(sessionId));
        if (session) {
          if (session.idTokenEnc) {
            try { idTokenForHint = decrypt(session.idTokenEnc)?.t || null; } catch {}
          }
          await Session.deleteOne({ _id: session._id });
        }
      }
      const url = await zitadel.buildEndSessionUrl(idTokenForHint, env.ZITADEL_POST_LOGOUT_URI);
      res.redirect(url);
    } catch (e) {
      console.error('[sso] logout failed:', e?.message);
      res.redirect((process.env.FRONTEND_BASE_URL || '') + '/login');
    }
  });

  return r;
};

function hasProjectRoles(claims) {
  if (!claims) return false;
  for (const k of Object.keys(claims)) {
    if (k.startsWith('urn:zitadel:iam:org:project') && k.endsWith(':roles')) return true;
  }
  return false;
}
