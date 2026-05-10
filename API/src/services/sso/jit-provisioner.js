// JIT (Just-In-Time) provisioning : à chaque login SSO, on synchronise les
// claims Zitadel avec le User en DB Kinn.
//
// - Si le user n'existe pas (par zitadelSub OU email), on le crée.
// - Si il existe, on update : role (sauf si localPromotion), kind, groups, name.
// - Lookup company via claims.kinn_client_id (ObjectId Mongo Kinn injecté en
//   User Metadata Zitadel par Kinn-panel au provisioning).
// - Workspace par défaut : si la company a un workspace `isDefault: true`,
//   l'user devient automatiquement membre. Sinon → orphelin (admin invitera).
//
// Atomic : 2 logins simultanés du même user créent un seul doc grâce à
// findOneAndUpdate avec $setOnInsert.

const { Types } = require('mongoose');
const User = require('../../db/models/user.model');
const Company = require('../../db/models/company.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const { mapRolesToKinnRole, extractProjectRoles } = require('./zitadel-client');

/**
 * Provisionne (ou met à jour) un User à partir des claims Zitadel.
 * @param {Object} claims - Claims décodés de l'ID token + (optionnel) /userinfo merge
 * @returns {Promise<{user, isNew}>}
 */
async function provisionFromClaims(claims) {
  if (!claims || !claims.sub) throw new Error('Claims invalides : sub manquant');
  if (!claims.email) throw new Error('Claims invalides : email manquant');
  if (claims.email_verified === false) throw new Error('Email non vérifié côté Zitadel');

  const zitadelSub = String(claims.sub);
  const email = String(claims.email).toLowerCase();
  const projectRoles = extractProjectRoles(claims);
  const role = mapRolesToKinnRole(projectRoles);
  const kind = String(claims.kinn_kind || 'client_user');
  const groups = Array.isArray(claims.kinn_groups) ? claims.kinn_groups.map(String) : [];
  const clientIdRaw = claims.kinn_client_id || null;

  // Resolve company : priorité au claim kinn_client_id (ObjectId Kinn), fallback orgId
  const company = await resolveCompany({ clientIdRaw, claims });
  if (!company) {
    throw new Error('Aucune Company Kinn ne correspond aux claims (kinn_client_id ou org_id absent ou inconnu)');
  }

  const update = {
    $set: {
      email,
      zitadelSub,
      role,
      kind,
      groups,
      companyId: company._id,
    },
    $setOnInsert: {
      sessionVersion: 0,
      bypassSSO: false,
      localPromotion: null,
    },
  };
  // Si claim contient name/given_name, on l'utilise pour les nouveaux users
  // (ne touche pas le name d'un user existant — il a peut-être édité localement)
  // Note : pas de field 'name' dans le schema actuel donc on ne stocke pas.

  // Atomic upsert : trouve par zitadelSub OU email (cas d'un user local promu en SSO)
  const filter = {
    $or: [{ zitadelSub }, { email }],
  };
  const before = await User.findOne(filter).lean();
  const user = await User.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  // Premier login : attache au workspace par défaut de la company si présent
  const isNew = !before;
  if (isNew) {
    await attachToDefaultWorkspace(user, company);
  }

  return { user, isNew };
}

async function resolveCompany({ clientIdRaw, claims }) {
  // 1. Lookup direct via kinn_client_id (User Metadata Zitadel posée par Kinn-panel)
  if (clientIdRaw && Types.ObjectId.isValid(String(clientIdRaw))) {
    const c = await Company.findById(String(clientIdRaw));
    if (c) return c;
  }
  // 2. Fallback : claim resourceowner id (scope urn:zitadel:iam:user:resourceowner)
  let orgId = claims['urn:zitadel:iam:user:resourceowner:id']
    || claims['urn:zitadel:org:id']
    || null;
  // 3. Fallback : extraire l'orgId depuis le claim des project roles.
  //    Format : { "admin": { "<orgId>": "<orgName>" } }
  if (!orgId) {
    const { extractProjectRoles } = require('./zitadel-client');
    const projectRoles = extractProjectRoles(claims);
    for (const innerMap of Object.values(projectRoles)) {
      if (innerMap && typeof innerMap === 'object') {
        const firstOrgId = Object.keys(innerMap)[0];
        if (firstOrgId) { orgId = firstOrgId; break; }
      }
    }
  }
  if (orgId) {
    const c = await Company.findOne({ zitadelOrgId: String(orgId) });
    if (c) return c;
  }
  // 4. Fallback ultime : 1 instance Kinn = 1 seule Company (par convention).
  //    Si la DB n'a qu'une Company, on la prend ET on la bind à l'orgId Zitadel
  //    pour que les logins suivants matchent direct via la voie #2.
  const total = await Company.countDocuments();
  if (total === 1) {
    const sole = await Company.findOne();
    if (sole) {
      if (orgId && !sole.zitadelOrgId) {
        try {
          await Company.updateOne({ _id: sole._id }, { $set: { zitadelOrgId: String(orgId) } });
          sole.zitadelOrgId = String(orgId);
          console.log(`[sso:jit] auto-bound Company ${sole._id} → zitadelOrgId=${orgId}`);
        } catch (e) {
          console.warn('[sso:jit] auto-bind zitadelOrgId failed:', e?.message);
        }
      }
      return sole;
    }
  }
  // Pas de match — log debug pour aider l'utilisateur à diagnostiquer
  try {
    console.warn('[sso:jit] resolveCompany failed', {
      kinn_client_id: clientIdRaw || null,
      orgId_from_resourceowner: claims['urn:zitadel:iam:user:resourceowner:id'] || null,
      orgId_from_roles_claim: orgId || null,
      total_companies_in_db: total,
      email: claims.email,
      sub: claims.sub,
      claimKeys: Object.keys(claims).slice(0, 30),
    });
  } catch {}
  return null;
}

async function attachToDefaultWorkspace(user, company) {
  const ws = await Workspace.findOne({ companyId: company._id, isDefault: true })
    || await Workspace.findOne({ companyId: company._id });
  if (!ws) return null;
  // Évite les doublons via index unique (userId+workspaceId si en place) ou
  // findOneAndUpdate atomique.
  await WorkspaceMembership.findOneAndUpdate(
    { userId: user._id, workspaceId: ws._id },
    { $setOnInsert: { userId: user._id, workspaceId: ws._id, role: 'editor' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!user.defaultWorkspaceId) {
    await User.updateOne({ _id: user._id }, { $set: { defaultWorkspaceId: ws._id } });
  }
  return ws;
}

module.exports = { provisionFromClaims };
