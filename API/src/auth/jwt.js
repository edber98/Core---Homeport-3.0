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
      req.user = payload.user; // { id, email, role, companyId }
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

module.exports = { sign, verify, authMiddleware, requireCompanyScope, requireAdmin };
