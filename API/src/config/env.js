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
  // Crée les users de démo (admin@acme.test, alice@acme.test, demo@beta.test).
  // En SaaS prod avec SSO : mets `SEED_DEMO_USERS=0` → aucun user créé au seed.
  // Le 1er admin sera auto-provisionné via JIT au premier login SSO.
  SEED_DEMO_USERS: readBool('SEED_DEMO_USERS', true),
  // Seed users: admin + alice for ACME, demo for BETA.
  // Roles : admin | editor | viewer (l'ancien 'user' est mappé sur 'editor').
  // Liste effective dépend de SEED_DEMO_USERS (cf. ci-dessus).
  get SEED_USERS() {
    if (!this.SEED_DEMO_USERS) return [];
    return [
      { email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD, role: 'admin', company: DEFAULT_COMPANY },
      { email: 'alice@acme.test', password: 'password', role: 'editor', company: DEFAULT_COMPANY },
      { email: 'demo@beta.test', password: 'demo', role: 'admin', company: SECOND_COMPANY },
    ];
  },
  // Crée le user `system@kinn.local` (admin) + son service token JWT au boot.
  // Utilisé par le plugin Kinn auto-référence (mode "local"). Mets =0 si pas besoin.
  LOCAL_SERVICE_TOKEN_ENABLED: readBool('LOCAL_SERVICE_TOKEN_ENABLED', true),
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

  // URL publique du backend Kinn (utilisée par les webhooks legacy /api/hooks/:token,
  // les HTTP triggers /api/trigger/:triggerId, et les redirects SSO).
  // Précédence : KINN_PUBLIC_URL > WEBHOOK_BASE_URL > localhost.
  WEBHOOK_BASE_URL: process.env.KINN_PUBLIC_URL || process.env.WEBHOOK_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '5055', 10)}`,
  KINN_PUBLIC_URL: process.env.KINN_PUBLIC_URL || process.env.WEBHOOK_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '5055', 10)}`,
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || '',

  // AI / LLM — auto-detect: if both keys exist, prefer Anthropic
  OPENAI_API_KEY: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5.2',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
  // Provider OpenAI-compatible auto-hébergé (vLLM, Ollama, LM Studio, ...)
  // AI_BASE_URL : URL du serveur (ex: 'http://192.168.1.10:8000/v1')
  // VLLM_MODEL  : modèle exposé par le serveur (ex: 'Qwen/Qwen3.6-35B-A3B-FP8')
  // VLLM_API_KEY: souvent 'local' ou laissé vide (vLLM accepte n'importe quoi)
  AI_BASE_URL: process.env.AI_BASE_URL || process.env.VLLM_BASE_URL || '',
  VLLM_MODEL: process.env.VLLM_MODEL || process.env.AI_MODEL_VLLM || '',
  VLLM_API_KEY: process.env.VLLM_API_KEY || 'local',
  get AI_PROVIDER() {
    if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
    if (this.AI_BASE_URL) return 'vllm';
    if (this.ANTHROPIC_API_KEY) return 'anthropic';
    return 'openai';
  },
  get AI_MODEL() {
    const p = this.AI_PROVIDER;
    if (p === 'anthropic' || p === 'claude') return this.ANTHROPIC_MODEL;
    if (['vllm','ollama','lmstudio','openai-compatible','openai-compat'].includes(p)) {
      return this.VLLM_MODEL || this.OPENAI_MODEL;
    }
    return this.OPENAI_MODEL;
  },
  get AI_API_KEY() {
    const p = this.AI_PROVIDER;
    if (p === 'anthropic' || p === 'claude') return this.ANTHROPIC_API_KEY;
    if (['vllm','ollama','lmstudio','openai-compatible','openai-compat'].includes(p)) {
      return this.VLLM_API_KEY;
    }
    return this.OPENAI_API_KEY;
  },
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '16384', 10),
  // GPT-5.2 reasoning & verbosity — 'none' disables reasoning tokens (fastest)
  // Effort: 'none' | 'low' | 'medium' | 'high' | 'xhigh'
  AI_REASONING_EFFORT: process.env.AI_REASONING_EFFORT || 'none',
  // Verbosity: 'low' | 'medium' | 'high'
  AI_VERBOSITY: process.env.AI_VERBOSITY || 'medium',
  // Force Chat Completions API instead of Responses API (set to 1 to disable Responses API)
  AI_FORCE_CHAT_COMPLETIONS: readBool('AI_FORCE_CHAT_COMPLETIONS', false),

  /**
   * Mode workspace pour les subagents :
   * - 'shared' (défaut) : tous les subagents partagent le même workspace/état
   *   (mode actuel — ils voient les mêmes fichiers, la même DB, etc.).
   * - 'isolated' : chaque subagent aura un git worktree / workspace isolé
   *   (non implémenté — stub prévu pour une future version).
   *
   * Intention : permettre plus tard que les subagents travaillent sur des copies
   * isolées du repo pour éviter les collisions quand ils modifient du code en
   * parallèle (ex: 3 subagents rédigent chacun un fichier différent sans se
   * marcher dessus). Pour l'instant ce flag n'est LU nulle part dans le code,
   * il sert à exposer l'intention et permettre au futur code de s'y brancher.
   */
  AI_AGENT_WORKTREE_MODE: process.env.AI_AGENT_WORKTREE_MODE || 'shared',

  // ── SSO Zitadel (injecté par Kinn-panel à l'install de l'instance) ──
  // SSO_MODE: 'disabled' | 'hybrid' (défaut MVP) | 'enforced'
  SSO_MODE: process.env.SSO_MODE || 'disabled',
  ZITADEL_ISSUER: process.env.ZITADEL_ISSUER || '',
  ZITADEL_CLIENT_ID: process.env.ZITADEL_CLIENT_ID || '',
  ZITADEL_CLIENT_SECRET: process.env.ZITADEL_CLIENT_SECRET || '',
  ZITADEL_PROJECT_ID: process.env.ZITADEL_PROJECT_ID || '',
  // Si non set, fallback auto sur ${KINN_PUBLIC_URL}/api/auth/sso/callback.
  // L'URL doit être déclarée à l'identique dans l'app OIDC Zitadel.
  ZITADEL_REDIRECT_URI: process.env.ZITADEL_REDIRECT_URI
    || (process.env.KINN_PUBLIC_URL
      ? String(process.env.KINN_PUBLIC_URL).replace(/\/+$/, '') + '/api/auth/sso/callback'
      : ''),
  // Si non set, fallback auto sur ${FRONTEND_BASE_URL}/login.
  ZITADEL_POST_LOGOUT_URI: process.env.ZITADEL_POST_LOGOUT_URI
    || (process.env.FRONTEND_BASE_URL
      ? String(process.env.FRONTEND_BASE_URL).replace(/\/+$/, '') + '/login'
      : ''),
  // Secret HMAC pour les webhooks /internal/* poussés par Kinn-panel
  KINN_PANEL_HMAC_SECRET: process.env.KINN_PANEL_HMAC_SECRET || '',
  // === OAuth Bouncer (concentrateur auth.kinn.fr) ===
  // Clé HS256 PARTAGÉE avec le panel + toute la flotte (signe/vérifie les `state` JWT).
  // Doit être IDENTIQUE partout. Générer 1x: `openssl rand -hex 32`.
  KINN_OAUTH_RELAY_SECRET: process.env.KINN_OAUTH_RELAY_SECRET || '',
  // URL du concentrateur. Le redirect_uri envoyé aux providers est `${url}/oauth/{vendor}/callback`.
  KINN_OAUTH_CONCENTRATOR_URL: (process.env.KINN_OAUTH_CONCENTRATOR_URL || 'https://auth.kinn.fr').replace(/\/+$/, ''),
};
