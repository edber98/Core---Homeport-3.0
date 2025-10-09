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
  return (req, res, next) => {
    let token = null;
    const h = req.headers['authorization'] || '';
    const m = /bearer (.+)/i.exec(h);
    if (m) token = m[1];
    // Fallback for EventSource/WebSocket: allow token via query param
    if (!token) token = (req.query && (req.query.token || req.query.access_token)) ? String(req.query.token || req.query.access_token) : null;
    if (!token) return res.status(401).json({ error: 'missing bearer token' });
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
