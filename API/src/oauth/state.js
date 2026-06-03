/**
 * OAuth `state` = JWT HS256 standard (RFC 7519, compact serialization).
 *
 * Implémenté à la main avec `crypto` (zéro dépendance) mais le résultat est
 * BYTE-POUR-BYTE un JWT HS256 classique : il est interopérable avec le
 * `jsonwebtoken.verify(token, secret, { algorithms:['HS256'] })` utilisé par
 * le concentrateur (Panel). Même secret partagé `KINN_OAUTH_RELAY_SECRET`.
 *
 * Le `state` transite par le navigateur + le provider + le bouncer : il est
 * SIGNÉ (intégrité/authenticité) mais PAS chiffré. N'y mettre aucun secret
 * (pas de codeVerifier PKCE) — uniquement du routage: { returnOrigin, vendor,
 * providerKey, nonce }.
 */
const crypto = require('crypto');
const { KINN_OAUTH_RELAY_SECRET } = require('../config/env');

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}
function b64urlDecodeToString(str) {
  let s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

function getSecret() {
  const secret = String(KINN_OAUTH_RELAY_SECRET || '').trim();
  if (!secret) throw new Error('KINN_OAUTH_RELAY_SECRET is not configured');
  return secret;
}

function sign(input, secret) {
  return b64url(crypto.createHmac('sha256', secret).update(input).digest());
}

/**
 * @param {object} payload  Claims métier (returnOrigin, vendor, providerKey, nonce).
 * @param {object} [opts]   { expiresInSec=600 }
 * @returns {string} JWT compact `header.payload.signature`
 */
function signOauthState(payload, opts = {}) {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (Number(opts.expiresInSec) || 600);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp };
  const headPart = b64urlJson(header);
  const bodyPart = b64urlJson(body);
  const signingInput = `${headPart}.${bodyPart}`;
  return `${signingInput}.${sign(signingInput, secret)}`;
}

/**
 * Vérifie signature + expiration. Lève une Error en cas d'échec :
 *  - 'state_invalid'  (format, alg, ou signature)
 *  - 'state_expired'  (exp dépassé)
 * @returns {object} les claims décodés
 */
function verifyOauthState(token) {
  const secret = getSecret();
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('state_invalid');
  const [headPart, bodyPart, sigPart] = parts;

  let header;
  try { header = JSON.parse(b64urlDecodeToString(headPart)); }
  catch { throw new Error('state_invalid'); }
  if (!header || header.alg !== 'HS256') throw new Error('state_invalid');

  const expected = sign(`${headPart}.${bodyPart}`, secret);
  // Comparaison à temps constant.
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('state_invalid');

  let body;
  try { body = JSON.parse(b64urlDecodeToString(bodyPart)); }
  catch { throw new Error('state_invalid'); }

  const now = Math.floor(Date.now() / 1000);
  if (body && body.exp && Number(body.exp) < now) throw new Error('state_expired');
  return body;
}

module.exports = { signOauthState, verifyOauthState };
