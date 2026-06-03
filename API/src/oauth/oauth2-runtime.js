const Provider = require('../db/models/provider.model');
const {
  buildTokenRequest,
  getProviderOAuth2Config,
  resolveOAuth2TokenCredentials,
} = require('./provider-auth');

const tokenCache = new Map();
const providerCache = new Map();
const PROVIDER_CACHE_TTL_MS = 60 * 1000;

async function loadProvider(providerKey) {
  const key = String(providerKey || '').trim();
  if (!key) return null;
  const now = Date.now();
  const cached = providerCache.get(key);
  if (cached && now < cached.expiresAt) return cached.provider;
  const provider = await Provider.findOne({ key }).lean();
  providerCache.set(key, { provider, expiresAt: now + PROVIDER_CACHE_TTL_MS });
  return provider;
}

/**
 * Rafraîchit (et cache ~1h) l'access token à partir du refresh token stocké
 * dans le credential. Parle DIRECTEMENT au endpoint token du provider avec le
 * client_secret local (env) — aucune dépendance runtime au concentrateur.
 */
async function getOAuth2AccessToken({ providerKey, credentials = {} }) {
  const effectiveProviderKey = String(providerKey || credentials.providerKey || '').trim();
  if (!effectiveProviderKey) throw new Error('Missing providerKey for OAuth2 credential refresh.');

  const provider = await loadProvider(effectiveProviderKey);
  const config = getProviderOAuth2Config(provider);
  if (!config) throw new Error(`Provider '${effectiveProviderKey}' is not configured for OAuth2.`);

  const resolved = resolveOAuth2TokenCredentials({ config, credentials });
  const cacheKey = `${effectiveProviderKey}::${resolved.clientId}::${resolved.refreshToken}`;
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && now < cached.tokenExpiry - 30000) return cached.accessToken;

  const request = buildTokenRequest({
    config,
    grantType: 'refresh_token',
    refreshToken: resolved.refreshToken,
    clientId: resolved.clientId,
    clientSecret: resolved.clientSecret,
    redirectUri: resolved.redirectUri,
    credentials,
  });

  const res = await fetch(request.tokenUrl, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });
  const data = await res.json();
  if (!res.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'Failed to refresh OAuth2 token.');
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    tokenExpiry: now + (Number(data.expires_in || 3600) * 1000),
  });
  return data.access_token;
}

module.exports = {
  getOAuth2AccessToken,
};
