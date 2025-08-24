const os = require('os');

function readBool(name, def=false){
  const v = process.env[name];
  if (v == null) return def; const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

module.exports = {
  PORT: parseInt(process.env.PORT || '5055', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HMAC_SECRET: process.env.HMAC_SECRET || 'dev-secret-change-me',
  TOKEN_TTL_SEC: parseInt(process.env.TOKEN_TTL_SEC || '86400', 10),
  SEED: readBool('SEED', true),
  SEED_COMPANIES: (process.env.SEED_COMPANIES || 'ACME,BETA').split(',').map(s=>s.trim()).filter(Boolean),
  SEED_USERS: [
    { email: 'admin@acme.test', password: 'admin', role: 'admin', company: 'ACME' },
    { email: 'alice@acme.test', password: 'alice', role: 'user', company: 'ACME' },
    { email: 'demo@beta.test',  password: 'demo',  role: 'user', company: 'BETA' },
  ],
  HOSTNAME: os.hostname(),
};

