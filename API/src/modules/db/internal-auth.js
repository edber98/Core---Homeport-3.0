// internal-auth.js — Webhooks /internal/* poussés par Kinn-panel.
//
// Auth = signature HMAC-SHA256 sur la requête complète.
//
// ══════════════════════════════════════════════════════════════════════════
// PROTOCOLE (DOIT matcher exactement ce que Panel envoie)
// ══════════════════════════════════════════════════════════════════════════
//
//   Headers :
//     X-Kinn-Panel-Signature: sha256=<hex>
//     X-Kinn-Panel-Timestamp: <unix-seconds>
//   Canonical : `${method}\n${path}\n${ts}\n${rawBody||''}`
//   Anti-replay : timestamp ±300s
//
// Le secret HMAC est partagé per-client : Panel injecte `KINN_PANEL_HMAC_SECRET`
// dans le pod kinn-app (généré par le worker, stocké chiffré dans la
// collection Secret côté Panel) → ce même secret sert à signer/vérifier
// dans les DEUX directions (kinn-app→Panel via panel-credits, Panel→kinn-app
// via kinn-app-webhook).
//
// IMPORTANT : ce format DOIT rester strictement aligné avec :
//   - API/src/middleware/hmac.js              (Panel récepteur)
//   - API/src/services/kinn-app-webhook.js   (Panel envoyeur)
//   - API/src/services/panel-credits/index.js (kinn-app envoyeur, helper)
//
// Endpoints :
//   POST /internal/auth/invalidate-session — incrémente User.sessionVersion
//        → tous les JWT actifs de cet user deviennent invalides.

const express = require('express');
const crypto = require('crypto');
const env = require('../../config/env');
const User = require('../../db/models/user.model');
const Session = require('../../db/models/session.model');

const MAX_CLOCK_SKEW_SEC = 300;

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let A, B;
  try {
    A = Buffer.from(a, 'hex');
    B = Buffer.from(b, 'hex');
  } catch { return false; }
  if (A.length === 0 || B.length === 0 || A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

/**
 * Vérifie la signature HMAC d'une requête entrante depuis Kinn-panel.
 * Renvoie un objet `{ok, code?}` pour permettre au caller de répondre
 * avec un message d'erreur précis (utile pour debug d'alignement protocole).
 */
function verifyHmac(req) {
  const secret = env.KINN_PANEL_HMAC_SECRET;
  if (!secret) return { ok: false, code: 'hmac_not_configured' };

  const sigHeader = String(req.headers['x-kinn-panel-signature'] || '');
  const tsHeader = String(req.headers['x-kinn-panel-timestamp'] || '');
  if (!sigHeader || !tsHeader) return { ok: false, code: 'hmac_missing_headers' };

  // Format attendu : "sha256=<hex>"
  const sigPrefix = 'sha256=';
  if (!sigHeader.startsWith(sigPrefix)) return { ok: false, code: 'hmac_bad_format' };
  const provided = sigHeader.slice(sigPrefix.length);

  // Timestamp : numérique + non expiré
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) return { ok: false, code: 'hmac_bad_timestamp' };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > MAX_CLOCK_SKEW_SEC) return { ok: false, code: 'hmac_expired' };

  // Canonical : method + path + ts + body
  // Note path : on prend `req.originalUrl` puis on strip la query string
  // (les query params ne sont PAS dans le canonical chez Panel).
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  const rawBody = (typeof req.rawBody === 'string')
    ? req.rawBody
    : (req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : '');
  const canonical = `${req.method}\n${path}\n${ts}\n${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');

  if (!timingSafeEqualHex(provided, expected)) {
    return { ok: false, code: 'hmac_bad_signature' };
  }
  return { ok: true };
}

module.exports = function() {
  const r = express.Router();

  r.post('/auth/invalidate-session', async (req, res) => {
    const v = verifyHmac(req);
    if (!v.ok) {
      // Log côté serveur pour diagnostiquer un mismatch éventuel sans
      // révéler la valeur réelle des headers/secret aux clients.
      console.warn(`[internal] invalidate-session rejected: ${v.code}`);
      return res.status(401).json({ error: v.code || 'invalid_signature' });
    }
    try {
      const { userId, reason } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'user_id_required' });
      const updated = await User.findByIdAndUpdate(
        userId,
        { $inc: { sessionVersion: 1 } },
        { new: true },
      );
      if (!updated) return res.status(404).json({ error: 'user_not_found' });
      // Cleanup des sessions SSO actives de cet user (refresh tokens devenus inutiles)
      await Session.deleteMany({ userId: updated._id });
      // Invalide aussi le cache local (cf. auth/jwt.js)
      try { require('../../auth/jwt').invalidateSessionVersionCache(String(updated._id)); } catch {}
      console.log(`[internal] session invalidated for user=${userId} reason="${reason || ''}" newVersion=${updated.sessionVersion}`);
      res.json({ ok: true, userId: String(updated._id), sessionVersion: updated.sessionVersion });
    } catch (e) {
      console.error('[internal] invalidate-session failed:', e?.message);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  return r;
};

// Export interne pour tests d'alignement protocole.
module.exports.__internal = { verifyHmac, timingSafeEqualHex };
