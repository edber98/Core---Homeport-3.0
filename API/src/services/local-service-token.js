// Service Token "Kinn local" — généré automatiquement au boot pour permettre
// au plugin Kinn (en mode local) et aux intégrations internes d'appeler l'API
// Kinn sans qu'un user ait à créer manuellement un PAT.
//
// Mécanisme :
//   1. Au boot, on cherche un user "system" admin (créé si absent)
//   2. On génère un JWT signé HMAC avec TTL très long (1 an, renouvelé à chaque boot)
//   3. On expose le token dans process.env.KINN_LOCAL_API_TOKEN
//   4. Le plugin Kinn en mode local lit cette env var
//
// Compatible SSO : ce mécanisme reste valide même quand le SSO Zitadel sera
// branché, car SSO et PAT sont des systèmes d'auth indépendants. Le service
// token n'est pas un login user — c'est une identité machine.

const { makeToken } = require('../utils/crypto');
const { HMAC_SECRET } = require('../config/env');

const SERVICE_USER_EMAIL = 'system@kinn.local';
const TOKEN_TTL_SEC = 365 * 24 * 60 * 60; // 1 an

/**
 * Crée le user "system" si absent et génère un service token JWT pour lui.
 * Idempotent : appelé à chaque boot, le user reste, le token est régénéré.
 *
 * @returns {Promise<{token: string, userId: string, companyId: string, workspaceId: string|null}>}
 */
async function ensureLocalServiceToken() {
  const Company = require('../db/models/company.model');
  const User = require('../db/models/user.model');
  const Workspace = require('../db/models/workspace.model');
  const WorkspaceMembership = require('../db/models/workspace-membership.model');
  const { hashPassword } = require('../utils/crypto');

  // 1. Trouve ou crée la company "system" (utilise la 1ère company existante
  //    si présente, sinon crée une dédiée. La logique est minimaliste.)
  let company = await Company.findOne().lean();
  if (!company) {
    // Pas de seed encore lancé → on attend, retourne null silencieusement
    return null;
  }

  // 2. Trouve ou crée le user system
  let user = await User.findOne({ email: SERVICE_USER_EMAIL });
  if (!user) {
    user = await User.create({
      email: SERVICE_USER_EMAIL,
      pwdHash: hashPassword('!_system_no_login_!_'), // ce user ne peut PAS se logger via UI
      role: 'admin',
      companyId: company._id,
    });
    console.log(`[local-service-token] created system user ${SERVICE_USER_EMAIL}`);
  }

  // 3. Trouve un workspace par défaut pour ce user (même company)
  let workspace = await Workspace.findOne({ companyId: company._id, isDefault: true }).lean();
  if (!workspace) workspace = await Workspace.findOne({ companyId: company._id }).lean();

  // 4. Crée la membership si absente
  if (workspace) {
    const exists = await WorkspaceMembership.findOne({ userId: user._id, workspaceId: workspace._id });
    if (!exists) {
      await WorkspaceMembership.create({
        userId: user._id,
        workspaceId: workspace._id,
        role: 'admin',
      });
    }
  }

  // 5. Génère le JWT (TTL 1 an, régénéré à chaque boot)
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    user: {
      id: String(user._id),
      email: user.email,
      role: user.role,
      companyId: String(user.companyId),
    },
    iat: nowSec,
    exp: nowSec + TOKEN_TTL_SEC,
    _system: true,
  };
  const token = makeToken(payload, HMAC_SECRET);

  return {
    token,
    userId: String(user._id),
    companyId: String(user.companyId),
    workspaceId: workspace ? String(workspace._id) : null,
  };
}

/**
 * Initialise le service token et l'expose via process.env.
 * À appeler au démarrage Kinn, après que MongoDB soit connecté et seedé.
 */
async function initLocalServiceToken() {
  try {
    const result = await ensureLocalServiceToken();
    if (!result) {
      console.log('[local-service-token] skipped (no company yet)');
      return;
    }
    process.env.KINN_LOCAL_API_TOKEN = result.token;
    if (result.workspaceId) {
      process.env.KINN_LOCAL_WORKSPACE_ID = process.env.KINN_LOCAL_WORKSPACE_ID || result.workspaceId;
    }
    // Affiche les premiers caractères pour debug, jamais le token complet
    console.log(`[local-service-token] ready (user=${result.userId}, token=${result.token.slice(0, 12)}…)`);
  } catch (e) {
    console.error('[local-service-token] init failed:', e?.message);
  }
}

module.exports = { initLocalServiceToken, ensureLocalServiceToken };
