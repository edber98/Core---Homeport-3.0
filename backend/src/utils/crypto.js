const crypto = require('crypto');

function b64url(buf){
  return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function hmacSign(data, secret){
  return b64url(crypto.createHmac('sha256', secret).update(data).digest());
}

function nowSec(){ return Math.floor(Date.now()/1000); }

function makeToken(payload, secret){
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => b64url(Buffer.from(JSON.stringify(obj)));
  const h = enc(header);
  const p = enc(payload);
  const sig = hmacSign(h + '.' + p, secret);
  return h + '.' + p + '.' + sig;
}

function verifyToken(token, secret){
  const parts = String(token||'').split('.');
  if (parts.length !== 3) throw new Error('invalid token');
  const [h, p, s] = parts; const expSig = hmacSign(h+'.'+p, secret);
  if (crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expSig)) === false) throw new Error('bad signature');
  const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
  return payload;
}

function hashPassword(password){
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  return b64url(salt) + ':' + b64url(key);
}

function verifyPassword(password, hashed){
  const [saltB64, keyB64] = String(hashed||'').split(':');
  if (!saltB64 || !keyB64) return false;
  const salt = Buffer.from(saltB64.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
  const key = Buffer.from(keyB64.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
  const cand = crypto.scryptSync(password, salt, 32);
  return crypto.timingSafeEqual(key, cand);
}

module.exports = { makeToken, verifyToken, nowSec, hashPassword, verifyPassword };

