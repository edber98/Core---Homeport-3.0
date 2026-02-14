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
const SECOND_COMPANY = process.env.SECOND_COMPANY || 'BETA';

module.exports = {
  PORT: parseInt(process.env.PORT || '5055', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HMAC_SECRET: process.env.HMAC_SECRET || 'dev-secret-change-me',
  TOKEN_TTL_SEC: parseInt(process.env.TOKEN_TTL_SEC || '86400', 10),
  SEED: readBool('SEED', true),
  // If SEED_COMPANIES is not set, use DEFAULT_COMPANY + SECOND_COMPANY
  SEED_COMPANIES: (process.env.SEED_COMPANIES || `${DEFAULT_COMPANY},${SECOND_COMPANY}`).split(',').map(s=>s.trim()).filter(Boolean),
  // Seed users: admin + alice for ACME, demo for BETA
  SEED_USERS: [
    { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, role: 'admin', company: DEFAULT_COMPANY },
    { email: 'alice@acme.test', password: 'password', role: 'user', company: DEFAULT_COMPANY },
    { email: 'demo@beta.test', password: 'demo', role: 'admin', company: SECOND_COMPANY },
  ],
  DEFAULT_COMPANY,
  SECOND_COMPANY,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_WORKSPACE_NAME,
  HOSTNAME: os.hostname(),

  // File storage
  FILE_STORAGE_TYPE: process.env.FILE_STORAGE_TYPE || 'local',
  FILE_STORAGE_PATH: process.env.FILE_STORAGE_PATH || './data/files',
  FILE_S3_BUCKET: process.env.FILE_S3_BUCKET || '',
  FILE_S3_REGION: process.env.FILE_S3_REGION || 'us-east-1',
  FILE_S3_ACCESS_KEY: process.env.FILE_S3_ACCESS_KEY || '',
  FILE_S3_SECRET_KEY: process.env.FILE_S3_SECRET_KEY || '',
  FILE_S3_ENDPOINT: process.env.FILE_S3_ENDPOINT || '',
  FILE_MAX_SIZE: process.env.FILE_MAX_SIZE || '200mb',
  FILE_TTL_DEFAULT: process.env.FILE_TTL_DEFAULT || '24h',
  FILE_CLEANUP_INTERVAL: process.env.FILE_CLEANUP_INTERVAL || '1h',
  FILE_EXECUTION_CLEANUP_DELAY: process.env.FILE_EXECUTION_CLEANUP_DELAY || '30m',

  // Webhook base URL for trigger system (used to generate webhook URLs)
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '5055', 10)}`,

  // AI / LLM — auto-detect: if both keys exist, prefer Anthropic
  OPENAI_API_KEY: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  get AI_PROVIDER() {
    if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
    if (this.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openai';
  },
  get AI_MODEL() {
    if (this.AI_PROVIDER === 'anthropic' || this.AI_PROVIDER === 'claude') return this.ANTHROPIC_MODEL;
    return this.OPENAI_MODEL;
  },
  get AI_API_KEY() {
    if (this.AI_PROVIDER === 'anthropic' || this.AI_PROVIDER === 'claude') return this.ANTHROPIC_API_KEY;
    return this.OPENAI_API_KEY;
  },
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '16384', 10),
};
