const crypto = require('crypto');
const { HMAC_SECRET } = require('../config/env');

function deriveKey(){
  const envKey = process.env.ENC_KEY;
  if (envKey && envKey.length >= 16){
    const b = Buffer.from(envKey.padEnd(32, '0').slice(0,32));
    if (b.length === 32) return b;
  }
  // Fallback: derive from HMAC_SECRET via scrypt
  return crypto.scryptSync(HMAC_SECRET || 'dev-secret', 'homeport-salt', 32);
}

const ENC_KEY = deriveKey();

function encrypt(obj){
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}

function decrypt(payload){
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

module.exports = { encrypt, decrypt };
