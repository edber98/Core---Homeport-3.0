const { makeToken, verifyToken, nowSec } = require('../utils/crypto');
const { HMAC_SECRET, TOKEN_TTL_SEC } = require('../config/env');

function sign(payload){
  const iat = nowSec();
  const exp = iat + TOKEN_TTL_SEC;
  return makeToken({ ...payload, iat, exp }, HMAC_SECRET);
}

function verify(token){
  const p = verifyToken(token, HMAC_SECRET);
  if (p && p.exp && p.exp < nowSec()) throw new Error('expired');
  return p;
}

// Cache in-memory User.sessionVersion → Number, TTL 30s.
// Invalide une session = bump User.sessionVersion → différent du JWT.sessionVersion → 401.
// Coût : 1 query DB par 30s par user actif (acceptable).
const _sessionVersionCache = new Map();
const SESSION_VERSION_TTL_MS = 30_000;

function invalidateSessionVersionCache(userId) {
  if (userId) _sessionVersionCache.delete(String(userId));
}

async function getCurrentSessionVersion(userId) {
  const id = String(userId);
  const now = Date.now();
  const cached = _sessionVersionCache.get(id);
  if (cached && cached.expiresAt > now) return cached.value;
  const User = require('../db/models/user.model');
  const u = await User.findById(id).select('sessionVersion').lean();
  const v = u ? Number(u.sessionVersion || 0) : 0;
  _sessionVersionCache.set(id, { value: v, expiresAt: now + SESSION_VERSION_TTL_MS });
  return v;
}

function authMiddleware(){
  return async (req, res, next) => {
    let token = null;
    const h = req.headers['authorization'] || '';
    const m = /bearer (.+)/i.exec(h);
    if (m) token = m[1];
    // Fallback for EventSource/WebSocket: allow token via query param
    if (!token) token = (req.query && (req.query.token || req.query.access_token)) ? String(req.query.token || req.query.access_token) : null;
    if (!token) return res.status(401).json({ error: 'missing bearer token' });
    // PAT (préfixe kpat_) → lookup en DB par hash SHA-256
    if (typeof token === 'string' && token.startsWith('kpat_')) {
      try {
        const meModule = require('../modules/db/me');
        const Pat = require('../db/models/personal-access-token.model');
        const User = require('../db/models/user.model');
        const tokenHash = meModule.hashToken(token);
        const pat = await Pat.findOne({ tokenHash });
        if (!pat) return res.status(401).json({ error: 'invalid pat' });
        if (pat.revokedAt) return res.status(401).json({ error: 'pat revoked' });
        if (pat.expiresAt && pat.expiresAt < new Date()) return res.status(401).json({ error: 'pat expired' });
        const user = await User.findById(pat.userId).lean();
        if (!user) return res.status(401).json({ error: 'pat owner missing' });
        req.user = {
          id: String(user._id),
          email: user.email,
          role: user.role,
          companyId: String(user.companyId),
        };
        // best-effort lastUsedAt update (fire and forget)
        Pat.updateOne({ _id: pat._id }, { lastUsedAt: new Date() }).catch(() => {});
        return next();
      } catch (e) {
        return res.status(401).json({ error: 'pat verification failed' });
      }
    }
    try {
      const payload = verify(token);
      req.user = payload.user; // { id, email, role, companyId, sessionVersion? }
      // Vérification sessionVersion (présent uniquement sur les JWT issus du SSO).
      // Si le JWT n'a pas de sessionVersion → JWT legacy (login email/pwd) → on n'applique pas.
      // Si présent → check vs DB pour respecter les invalidations webhook.
      if (typeof payload.user?.sessionVersion === 'number' && payload.user?.id) {
        const current = await getCurrentSessionVersion(payload.user.id);
        if (Number(payload.user.sessionVersion) < current) {
          return res.status(401).json({ error: 'session_invalidated' });
        }
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'invalid token' });
    }
  };
}

function requireCompanyScope(){
  return (req, res, next) => {
    if (!req.user || !req.user.companyId) return res.status(401).json({ error: 'no company scope' });
    next();
  };
}

function requireAdmin(){
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'admin required' });
    next();
  };
}

module.exports = { sign, verify, authMiddleware, requireCompanyScope, requireAdmin, invalidateSessionVersionCache };
