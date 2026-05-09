// Wrapper openid-client pour Zitadel.
//
// Singleton lazy : Issuer.discover (appel /.well-known/openid-configuration)
// est fait au premier usage, puis caché. Si le metadata Zitadel change, le
// process doit redémarrer.

const { Issuer, generators } = require('openid-client');
const env = require('../../config/env');

let _issuer = null;
let _client = null;
let _discoverPromise = null;

async function getIssuer() {
  if (_issuer) return _issuer;
  if (_discoverPromise) return _discoverPromise.then(() => _issuer);
  if (!env.ZITADEL_ISSUER) throw new Error('ZITADEL_ISSUER non configuré');
  _discoverPromise = Issuer.discover(env.ZITADEL_ISSUER).then((iss) => {
    _issuer = iss;
    _discoverPromise = null;
    return iss;
  }).catch((e) => {
    _discoverPromise = null;
    throw e;
  });
  return _discoverPromise;
}

async function getClient() {
  if (_client) return _client;
  const issuer = await getIssuer();
  if (!env.ZITADEL_CLIENT_ID) throw new Error('ZITADEL_CLIENT_ID non configuré');
  _client = new issuer.Client({
    client_id: env.ZITADEL_CLIENT_ID,
    client_secret: env.ZITADEL_CLIENT_SECRET || undefined,
    redirect_uris: [env.ZITADEL_REDIRECT_URI],
    post_logout_redirect_uris: [env.ZITADEL_POST_LOGOUT_URI].filter(Boolean),
    response_types: ['code'],
    token_endpoint_auth_method: env.ZITADEL_CLIENT_SECRET ? 'client_secret_basic' : 'none',
  });
  return _client;
}

/** Génère les paramètres PKCE + state + nonce pour démarrer un flow SSO. */
function buildAuthRequest() {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);
  const state = generators.state();
  const nonce = generators.nonce();
  const projectId = env.ZITADEL_PROJECT_ID || '';
  // Scope restreint au project Kinn courant pour éviter de leak les rôles
  // d'autres projects de la même org Zitadel.
  const projectRolesScope = projectId
    ? `urn:zitadel:iam:org:project:${projectId}:roles`
    : 'urn:zitadel:iam:org:project:roles';
  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    projectRolesScope,
  ].join(' ');
  return { code_verifier, code_challenge, state, nonce, scopes };
}

/** Construit l'URL d'autorisation Zitadel pour une demande SSO donnée. */
async function buildAuthorizationUrl({ code_challenge, state, nonce, scopes }) {
  const client = await getClient();
  return client.authorizationUrl({
    scope: scopes,
    state,
    nonce,
    code_challenge,
    code_challenge_method: 'S256',
  });
}

/** Échange du code contre les tokens (id_token, access_token, refresh_token). */
async function exchangeCode({ code, code_verifier, state, nonce }) {
  const client = await getClient();
  const params = client.callbackParams({ url: `?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}` });
  const tokenSet = await client.callback(env.ZITADEL_REDIRECT_URI, params, { code_verifier, state, nonce });
  return tokenSet;
}

/** Refresh le tokenSet via le refresh_token. */
async function refreshTokens(refreshToken) {
  const client = await getClient();
  return client.refresh(refreshToken);
}

/** Appel /userinfo (fallback si claims manquent dans l'ID token). */
async function fetchUserinfo(accessToken) {
  const client = await getClient();
  return client.userinfo(accessToken);
}

/** Construit l'URL de end_session (RP-initiated logout). */
async function buildEndSessionUrl(idToken, postLogoutRedirectUri) {
  const client = await getClient();
  return client.endSessionUrl({
    id_token_hint: idToken,
    post_logout_redirect_uri: postLogoutRedirectUri || env.ZITADEL_POST_LOGOUT_URI,
  });
}

/** Extrait les project roles depuis les claims de l'ID token. */
function extractProjectRoles(claims) {
  if (!claims || typeof claims !== 'object') return {};
  const projectId = env.ZITADEL_PROJECT_ID || '';
  // Claim Zitadel : urn:zitadel:iam:org:project:{projectId}:roles
  const key = projectId
    ? `urn:zitadel:iam:org:project:${projectId}:roles`
    : null;
  let roles = key ? claims[key] : null;
  // Fallback sur claim générique (sans projectId) si le scope-restreint absent
  if (!roles) {
    roles = claims['urn:zitadel:iam:org:project:roles']
      || claims['urn:zitadel:iam:org:projects:roles']
      || null;
  }
  return roles || {};
}

// Rang relatif pour résoudre les conflits si un user a plusieurs rôles
const KINN_ROLE_RANK = { admin: 3, editor: 2, viewer: 1 };

/**
 * Parse l'env SSO_ROLE_MAP (format : "zitadelRoleA:kinnRoleA,zitadelRoleB:kinnRoleB").
 * Si vide → mapping 1:1 par défaut (admin/editor/viewer en miroir).
 * Une entrée "*:<role>" définit le fallback (sinon "editor").
 */
function parseRoleMap() {
  const raw = String(process.env.SSO_ROLE_MAP || '').trim();
  const map = new Map();
  let fallback = 'editor';
  if (!raw) {
    // Default 1:1
    map.set('admin', 'admin');
    map.set('editor', 'editor');
    map.set('viewer', 'viewer');
    return { map, fallback };
  }
  for (const pair of raw.split(',')) {
    const [from, to] = pair.split(':').map(s => String(s || '').trim());
    if (!from || !to) continue;
    if (!['admin', 'editor', 'viewer'].includes(to)) continue; // ignore mappings invalides
    if (from === '*') { fallback = to; continue; }
    map.set(from, to);
  }
  return { map, fallback };
}

/**
 * Map les project roles Zitadel → un rôle Kinn unique.
 * Si l'user a plusieurs rôles, on prend le plus haut (admin > editor > viewer).
 * Configurable via env SSO_ROLE_MAP.
 */
function mapRolesToKinnRole(projectRoles) {
  const { map, fallback } = parseRoleMap();
  const zitadelRoles = Object.keys(projectRoles || {});
  let best = null;
  for (const zr of zitadelRoles) {
    const kr = map.get(zr);
    if (!kr) continue;
    if (!best || (KINN_ROLE_RANK[kr] || 0) > (KINN_ROLE_RANK[best] || 0)) best = kr;
  }
  return best || fallback;
}

module.exports = {
  getClient,
  getIssuer,
  buildAuthRequest,
  buildAuthorizationUrl,
  exchangeCode,
  refreshTokens,
  fetchUserinfo,
  buildEndSessionUrl,
  extractProjectRoles,
  mapRolesToKinnRole,
};
