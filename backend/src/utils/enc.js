const crypto = require('crypto');
const { HMAC_SECRET } = require('../config/env');

function keyFromEncKey(encKey){
  if (!encKey || encKey.length < 16) return null;
  try {
    const b = Buffer.from(encKey.padEnd(32, '0').slice(0, 32));
    return b.length === 32 ? b : null;
  } catch {
    return null;
  }
}

function keyFromHmacSecret(secret){
  const s = secret || 'dev-secret';
  return crypto.scryptSync(s, 'homeport-salt', 32);
}

function deriveKeyCandidates(){
  const candidates = [];
  const envKey = keyFromEncKey(process.env.ENC_KEY);
  if (envKey) candidates.push(envKey);
  // Always include HMAC-derived key as a fallback for backwards compatibility
  try { candidates.push(keyFromHmacSecret(HMAC_SECRET)); } catch {}
  // De-duplicate by hex value
  const seen = new Set();
  return candidates.filter(k => { const h = k.toString('hex'); if (seen.has(h)) return false; seen.add(h); return true; });
}

function encrypt(obj){
  const keys = deriveKeyCandidates();
  const key = keys[0];
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}

function tryDecryptWithKey(payload, key){
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

function decrypt(payload){
  const keys = deriveKeyCandidates();
  let lastErr = null;
  for (const key of keys){
    try { return tryDecryptWithKey(payload, key); } catch (e) { lastErr = e; }
  }
  // Re-throw last error to caller for consistent handling
  throw lastErr || new Error('decrypt_failed');
}

module.exports = { encrypt, decrypt };
