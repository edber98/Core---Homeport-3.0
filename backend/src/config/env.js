const os = require('os');

function readBool(name, def=false){
  const v = process.env[name];
  if (v == null) return def; const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

const DEFAULT_COMPANY = process.env.DEFAULT_COMPANY || 'ACME';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@acme.test';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
const DEFAULT_WORKSPACE_NAME = process.env.DEFAULT_WORKSPACE_NAME || 'Default';

module.exports = {
  PORT: parseInt(process.env.PORT || '5055', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HMAC_SECRET: process.env.HMAC_SECRET || 'dev-secret-change-me',
  TOKEN_TTL_SEC: parseInt(process.env.TOKEN_TTL_SEC || '86400', 10),
  SEED: readBool('SEED', true),
  // If SEED_COMPANIES is not set, use DEFAULT_COMPANY
  SEED_COMPANIES: (process.env.SEED_COMPANIES || DEFAULT_COMPANY).split(',').map(s=>s.trim()).filter(Boolean),
  // Seed users: by default only the admin from env
  SEED_USERS: [
    { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, role: 'admin', company: DEFAULT_COMPANY },
  ],
  DEFAULT_COMPANY,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_WORKSPACE_NAME,
  HOSTNAME: os.hostname(),
};
