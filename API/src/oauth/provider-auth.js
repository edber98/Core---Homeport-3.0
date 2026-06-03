const { PORT, KINN_OAUTH_CONCENTRATOR_URL } = require('../config/env');

function trim(value) {
  return String(value == null ? '' : value).trim();
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(source, path) {
  const parts = String(path || '').split('.').map(s => s.trim()).filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function resolvePrefixedValue(expr, sources) {
  if (Array.isArray(expr)) {
    for (const item of expr) {
      const resolved = resolvePrefixedValue(item, sources);
      if (resolved != null && resolved !== '') return resolved;
    }
    return undefined;
  }
  const value = trim(expr);
  if (!value) return undefined;
  const prefixes = ['token', 'userinfo', 'credential', 'context', 'env'];
  for (const prefix of prefixes) {
    const marker = `${prefix}.`;
    if (!value.startsWith(marker)) continue;
    return getByPath(sources[prefix], value.slice(marker.length));
  }
  return value;
}

function renderTemplateString(input, sources) {
  const raw = String(input == null ? '' : input);
  if (!raw) return '';
  return raw.replace(/\{(env|context|token|userinfo|credential):([^}|]+)(?:\|([^}]*))?\}/g, (_match, sourceName, sourcePath, fallback) => {
    const value = getByPath(sources[sourceName], sourcePath);
    if (value == null || value === '') return fallback == null ? '' : fallback;
    return String(value);
  });
}

function renderTemplateValue(value, sources) {
  if (Array.isArray(value)) return value.map(item => renderTemplateValue(item, sources));
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = renderTemplateValue(item, sources);
    return out;
  }
  if (typeof value === 'string') return renderTemplateString(value, sources);
  return value;
}

function ensureScopeList(scopes) {
  if (!Array.isArray(scopes)) return [];
  const out = [];
  for (const scope of scopes) {
    const value = trim(scope);
    if (value && !out.includes(value)) out.push(value);
  }
  return out;
}

function createOAuth2PkcePair(config = {}) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = require('crypto').randomBytes(64);
  let codeVerifier = '';
  for (const byte of bytes) codeVerifier += chars[byte % chars.length];

  const hash = require('crypto').createHash('sha256').update(codeVerifier).digest();
  const encoding = trim(config.pkceChallengeEncoding || 'base64url').toLowerCase();
  const codeChallenge = encoding === 'hex'
    ? hash.toString('hex')
    : hash.toString('base64url');

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: trim(config.pkceChallengeMethod || 'S256') || 'S256',
  };
}

function getProviderAuth(provider) {
  return isPlainObject(provider?.auth) ? provider.auth : null;
}

function isOAuth2Provider(provider) {
  return trim(getProviderAuth(provider)?.type).toLowerCase() === 'oauth2';
}

function getProviderOAuth2Config(provider) {
  const auth = getProviderAuth(provider);
  if (!auth || trim(auth.type).toLowerCase() !== 'oauth2') return null;
  const oauth2 = isPlainObject(auth.oauth2) ? auth.oauth2 : auth;
  // `vendor` = slug d'URL OAuth (ex "google") partagé par plusieurs providerKey
  // (googleDrive/googleDocs/googleSheets). C'est lui qui apparaît dans le
  // redirect_uri enregistré chez le provider et dans le path du bouncer.
  // Fallback: la clé du provider Kinn elle-même.
  const vendor = trim(oauth2.vendor || provider?.key || provider?.providerKey).toLowerCase();
  const config = {
    vendor,
    // Si true → le redirect_uri passe par le concentrateur auth.kinn.fr.
    useBouncer: oauth2.useBouncer === true,
    authorizeUrl: trim(oauth2.authorizeUrl),
    tokenUrl: trim(oauth2.tokenUrl),
    userinfoUrl: trim(oauth2.userinfoUrl),
    clientIdEnv: trim(oauth2.clientIdEnv),
    clientSecretEnv: trim(oauth2.clientSecretEnv),
    clientIdParam: trim(oauth2.clientIdParam) || 'client_id',
    clientSecretParam: trim(oauth2.clientSecretParam) || 'client_secret',
    redirectUriEnv: trim(oauth2.redirectUriEnv),
    defaultRedirectUri: trim(oauth2.defaultRedirectUri),
    scopes: ensureScopeList(oauth2.scopes),
    scopeSeparator: trim(oauth2.scopeSeparator) || ' ',
    authorizationParams: isPlainObject(oauth2.authorizationParams) ? oauth2.authorizationParams : {},
    tokenParams: isPlainObject(oauth2.tokenParams) ? oauth2.tokenParams : {},
    authorizationCodeParams: isPlainObject(oauth2.authorizationCodeParams) ? oauth2.authorizationCodeParams : {},
    refreshTokenParams: isPlainObject(oauth2.refreshTokenParams) ? oauth2.refreshTokenParams : {},
    fieldMap: isPlainObject(oauth2.fieldMap) ? oauth2.fieldMap : {},
    tokenAuthMethod: trim(oauth2.tokenAuthMethod || 'body').toLowerCase() || 'body',
    requireRefreshToken: oauth2.requireRefreshToken !== false,
    pkce: oauth2.pkce === true,
    pkceChallengeMethod: trim(oauth2.pkceChallengeMethod || 'S256') || 'S256',
    pkceChallengeEncoding: trim(oauth2.pkceChallengeEncoding || 'base64url').toLowerCase() || 'base64url',
  };
  if (!config.authorizeUrl || !config.tokenUrl) return null;
  return config;
}

/**
 * Calcule le redirect_uri OAuth. UNIQUE source de vérité, à utiliser à la fois
 * pour l'authorize URL (prepare) ET l'échange code→token (callback) : si les
 * deux diffèrent, le provider rejette `invalid_grant`.
 */
function computeRedirectUri({ config, returnOrigin }) {
  if (config.useBouncer) {
    return `${String(KINN_OAUTH_CONCENTRATOR_URL || '').replace(/\/+$/, '')}/oauth/${config.vendor}/callback`;
  }
  // Mode local (sans bouncer) : env explicite > defaultRedirectUri templaté > origin courant.
  const env = resolveOAuth2Environment(config, { context: { returnOrigin } });
  if (env.redirectUri) return env.redirectUri;
  return `${String(returnOrigin || '').replace(/\/+$/, '')}/oauth/${config.vendor}/callback`;
}

function getTemplateSources(extra = {}) {
  return {
    env: { PORT: String(process.env.PORT || PORT || 5055), ...process.env },
    context: isPlainObject(extra.context) ? extra.context : {},
    token: isPlainObject(extra.token) ? extra.token : {},
    userinfo: isPlainObject(extra.userinfo) ? extra.userinfo : {},
    credential: isPlainObject(extra.credential) ? extra.credential : {},
  };
}

function resolveOAuth2Environment(config, extra = {}) {
  const sources = getTemplateSources(extra);
  const clientId = trim(config?.clientIdEnv ? sources.env[config.clientIdEnv] : '');
  const clientSecret = trim(config?.clientSecretEnv ? sources.env[config.clientSecretEnv] : '');
  const redirectUriFromEnv = trim(config?.redirectUriEnv ? sources.env[config.redirectUriEnv] : '');
  const redirectUri = redirectUriFromEnv || renderTemplateString(config?.defaultRedirectUri || '', sources);
  return { clientId, clientSecret, redirectUri };
}

function buildOAuth2AuthorizationUrl({ config, clientId, redirectUri, state, scopes, codeChallenge, codeChallengeMethod }) {
  const sources = getTemplateSources({ context: { state, redirectUri } });
  const resolvedAuthorizeUrl = renderTemplateString(config.authorizeUrl, sources);
  const url = new URL(resolvedAuthorizeUrl);
  const params = new URLSearchParams(url.search);
  params.set(config.clientIdParam || 'client_id', clientId);
  params.set('redirect_uri', redirectUri);
  params.set('response_type', 'code');
  params.set('state', state);
  const resolvedScopes = ensureScopeList(scopes || config.scopes);
  if (resolvedScopes.length) params.set('scope', resolvedScopes.join(config.scopeSeparator || ' '));
  if (config.pkce && codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', codeChallengeMethod || config.pkceChallengeMethod || 'S256');
  }
  for (const [key, value] of Object.entries(renderTemplateValue(config.authorizationParams || {}, sources))) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }
  url.search = params.toString();
  return url.toString();
}

function normalizeOAuth2CredentialValues({ providerKey, config, tokenData = {}, userInfo = {} }) {
  const sources = getTemplateSources({
    token: tokenData,
    userinfo: userInfo,
    context: { providerKey },
  });
  const values = {};
  const baseFieldMap = {
    refreshToken: 'token.refresh_token',
    scope: 'token.scope',
    tokenType: 'token.token_type',
    accountEmail: 'userinfo.email',
    accountName: 'userinfo.name',
  };
  const fieldMap = { ...baseFieldMap, ...(config?.fieldMap || {}) };
  for (const [field, expr] of Object.entries(fieldMap)) {
    const resolved = resolvePrefixedValue(expr, sources);
    if (resolved == null || resolved === '') continue;
    values[field] = typeof resolved === 'string' ? trim(resolved) : resolved;
  }
  if (!values.tokenType) values.tokenType = trim(tokenData.token_type || 'Bearer');
  values.connectedAt = new Date().toISOString();
  values.providerKey = trim(providerKey);
  return values;
}

function resolveOAuth2TokenCredentials({ config, credentials = {} }) {
  const env = resolveOAuth2Environment(config, { credential: credentials });
  const clientId = env.clientId || trim(credentials.clientId);
  const clientSecret = env.clientSecret || trim(credentials.clientSecret);
  const refreshToken = trim(credentials.refreshToken);
  const redirectUri = env.redirectUri;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth2 credentials (clientId, clientSecret, refreshToken).');
  }
  return { clientId, clientSecret, refreshToken, redirectUri };
}

function buildTokenRequest({ config, grantType, code, refreshToken, clientId, clientSecret, redirectUri, credentials = {}, codeVerifier }) {
  const sources = getTemplateSources({
    credential: credentials,
    context: { grantType, redirectUri },
  });
  const body = new URLSearchParams();
  body.set('grant_type', grantType);
  if (grantType === 'authorization_code') {
    body.set('code', trim(code));
    if (redirectUri) body.set('redirect_uri', redirectUri);
    if (config.pkce && codeVerifier) body.set('code_verifier', trim(codeVerifier));
  }
  if (grantType === 'refresh_token') {
    body.set('refresh_token', trim(refreshToken));
  }
  if (config.tokenAuthMethod !== 'basic') {
    body.set(config.clientIdParam || 'client_id', clientId);
    body.set(config.clientSecretParam || 'client_secret', clientSecret);
  }
  const mergedParams = {
    ...(config.tokenParams || {}),
    ...(grantType === 'authorization_code' ? (config.authorizationCodeParams || {}) : {}),
    ...(grantType === 'refresh_token' ? (config.refreshTokenParams || {}) : {}),
  };
  for (const [key, value] of Object.entries(renderTemplateValue(mergedParams, sources))) {
    if (value == null || value === '') continue;
    body.set(key, String(value));
  }
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (config.tokenAuthMethod === 'basic') {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }
  const tokenUrl = renderTemplateString(config.tokenUrl, sources);
  return { tokenUrl, headers, body };
}

function buildUserInfoRequest({ config, accessToken, credentials = {} }) {
  const sources = getTemplateSources({
    credential: credentials,
    token: { access_token: accessToken },
  });
  const userinfoUrl = renderTemplateString(config.userinfoUrl || '', sources);
  if (!userinfoUrl) return null;
  return {
    userinfoUrl,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

module.exports = {
  buildOAuth2AuthorizationUrl,
  buildTokenRequest,
  buildUserInfoRequest,
  computeRedirectUri,
  createOAuth2PkcePair,
  getProviderAuth,
  getProviderOAuth2Config,
  isOAuth2Provider,
  normalizeOAuth2CredentialValues,
  renderTemplateString,
  renderTemplateValue,
  resolveOAuth2Environment,
  resolveOAuth2TokenCredentials,
};
