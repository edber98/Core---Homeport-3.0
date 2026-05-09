// Webhooks /internal/* poussés par Kinn-panel.
// Auth = signature HMAC-SHA256 sur le body, header X-Kinn-Panel-Signature.
//
// Endpoints :
//   POST /internal/auth/invalidate-session — incrémente User.sessionVersion → JWT actuel devient invalide.

const express = require('express');
const crypto = require('crypto');
const env = require('../../config/env');
const User = require('../../db/models/user.model');
const Session = require('../../db/models/session.model');

function timingSafeEq(a, b) {
  try {
    const A = Buffer.from(String(a || ''), 'utf8');
    const B = Buffer.from(String(b || ''), 'utf8');
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch { return false; }
}

function verifyHmac(req) {
  if (!env.KINN_PANEL_HMAC_SECRET) return false;
  const sig = String(req.headers['x-kinn-panel-signature'] || '');
  if (!sig) return false;
  // Format attendu : "sha256=<hex>" ou juste "<hex>"
  const candidate = sig.startsWith('sha256=') ? sig.slice(7) : sig;
  const body = req.rawBody || JSON.stringify(req.body || {});
  const computed = crypto.createHmac('sha256', env.KINN_PANEL_HMAC_SECRET).update(body).digest('hex');
  return timingSafeEq(computed, candidate);
}

module.exports = function() {
  const r = express.Router();

  r.post('/auth/invalidate-session', async (req, res) => {
    if (!verifyHmac(req)) return res.status(401).json({ error: 'invalid_signature' });
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
