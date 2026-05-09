// Helpers partagés par les resolvers core_webhook_*.
// Centralise lookup flow + node + httpTriggers entry, génération+persist initial.

const crypto = require('crypto');
const { Types } = require('mongoose');
const Flow = require('../../db/models/flow.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const { encrypt, decrypt } = require('../../utils/enc');
const { newId } = require('../../utils/ids');

async function loadFlow(flowId) {
  let flow = null;
  if (Types.ObjectId.isValid(String(flowId))) flow = await Flow.findById(flowId);
  if (!flow) flow = await Flow.findOne({ id: String(flowId) });
  return flow;
}

async function assertMember(flow, user) {
  const ws = await Workspace.findById(flow.workspaceId);
  if (!ws) throw new Error('Workspace introuvable');
  if (String(ws.companyId) !== String(user.companyId)) throw new Error('Forbidden (company)');
  const member = await WorkspaceMembership.findOne({ userId: user.id, workspaceId: ws._id });
  if (!member) throw new Error('Not a workspace member');
  return { workspace: ws, role: member.role };
}

function assertAdminMember(memberInfo) {
  if (memberInfo.role !== 'admin' && memberInfo.role !== 'owner') {
    throw new Error('Admin du workspace requis pour cette action');
  }
}

function findNode(flow, nodeId) {
  const nodes = flow.graph?.nodes || [];
  const n = nodes.find(x => x.id === nodeId);
  if (!n) throw new Error(`Node ${nodeId} introuvable dans le flow`);
  return n;
}

// Récupère (ou crée si absent) l'entrée httpTriggers[nodeId].
// L'entrée porte un triggerId stable + bundle chiffré des secrets d'auth.
//
// Implémentation atomique : plusieurs resolvers (URL/token/password/hmac)
// peuvent fire EN PARALLÈLE sur le même flow au mount du panel. Sans
// findOneAndUpdate atomique, les saves concurrents lèvent une VersionError
// Mongoose ("No matching document found for id ... version N").
async function ensureHttpTriggerEntry(flow, nodeId, { autoCreate = true } = {}) {
  flow.httpTriggers = flow.httpTriggers || {};
  if (flow.httpTriggers[nodeId]) return flow.httpTriggers[nodeId];
  if (!autoCreate) return null;

  const Flow = require('../../db/models/flow.model');
  const triggerId = newId('htg');
  const newEntry = {
    triggerId,
    encryptedAuth: encrypt({
      token: generateSecret(40),
      password: generateSecret(24),
      hmacSecret: generateSecret(32),
    }),
    createdAt: new Date(),
    rotatedAt: null,
  };

  // Crée l'entrée seulement si elle n'existe pas encore (anti-race)
  const updated = await Flow.findOneAndUpdate(
    { _id: flow._id, [`httpTriggers.${nodeId}`]: { $exists: false } },
    {
      $set: { [`httpTriggers.${nodeId}`]: newEntry },
      $addToSet: { httpTriggerIds: triggerId },
    },
    { new: true },
  );

  if (updated) {
    // On a gagné la course — sync l'objet local avec le state DB
    flow.httpTriggers = updated.httpTriggers || {};
    flow.httpTriggerIds = updated.httpTriggerIds || [];
    return flow.httpTriggers[nodeId];
  }

  // Course perdue : un autre resolver vient de créer l'entrée. Reload.
  const reloaded = await Flow.findById(flow._id);
  if (reloaded?.httpTriggers?.[nodeId]) {
    flow.httpTriggers = reloaded.httpTriggers;
    flow.httpTriggerIds = reloaded.httpTriggerIds || [];
    return flow.httpTriggers[nodeId];
  }
  // Cas extrême : le flow a été supprimé entretemps
  throw new Error('Flow disparu pendant la création de l\'entrée httpTrigger');
}

// Reconstruit l'array plat httpTriggerIds depuis la map httpTriggers.
function syncTriggerIds(flow) {
  const ids = Object.values(flow.httpTriggers || {})
    .map(e => e && e.triggerId)
    .filter(Boolean);
  flow.httpTriggerIds = ids;
}

function decryptSecrets(entry) {
  if (!entry || !entry.encryptedAuth) return {};
  try { return decrypt(entry.encryptedAuth) || {}; } catch { return {}; }
}

function generateSecret(byteLen = 32) {
  return crypto.randomBytes(byteLen).toString('base64url');
}

// Regenère un secret précis dans le bundle chiffré sans toucher aux autres.
// Utilise findOneAndUpdate atomique pour éviter les conflits de version Mongoose.
async function rotateSecretField(flow, nodeId, secretKey) {
  const Flow = require('../../db/models/flow.model');
  const entry = await ensureHttpTriggerEntry(flow, nodeId);
  const secrets = decryptSecrets(entry);
  secrets[secretKey] = generateSecret(secretKey === 'token' ? 40 : 32);
  const newEncrypted = encrypt(secrets);
  const rotatedAt = new Date();
  const updated = await Flow.findOneAndUpdate(
    { _id: flow._id },
    {
      $set: {
        [`httpTriggers.${nodeId}.encryptedAuth`]: newEncrypted,
        [`httpTriggers.${nodeId}.rotatedAt`]: rotatedAt,
      },
    },
    { new: true },
  );
  if (updated) {
    flow.httpTriggers = updated.httpTriggers || {};
    flow.httpTriggerIds = updated.httpTriggerIds || [];
  }
  return secrets[secretKey];
}

async function rotateTriggerId(flow, nodeId) {
  const Flow = require('../../db/models/flow.model');
  const oldEntry = await ensureHttpTriggerEntry(flow, nodeId);
  const newTriggerId = newId('htg');
  const rotatedAt = new Date();
  // Atomic : remplace triggerId + maintient httpTriggerIds en miroir
  const updated = await Flow.findOneAndUpdate(
    { _id: flow._id },
    {
      $set: {
        [`httpTriggers.${nodeId}.triggerId`]: newTriggerId,
        [`httpTriggers.${nodeId}.rotatedAt`]: rotatedAt,
      },
      $pull: { httpTriggerIds: oldEntry.triggerId },
    },
    { new: true },
  );
  if (updated) {
    // Ajoute le nouveau triggerId (en deuxième temps car $pull et $addToSet sur
    // le même tableau dans une seule opération peut être conflictuel).
    await Flow.updateOne({ _id: flow._id }, { $addToSet: { httpTriggerIds: newTriggerId } });
    const reloaded = await Flow.findById(flow._id);
    if (reloaded) {
      flow.httpTriggers = reloaded.httpTriggers || {};
      flow.httpTriggerIds = reloaded.httpTriggerIds || [];
    }
  }
  return newTriggerId;
}

function publicBaseUrl() {
  // Précédence cohérente avec env.js : KINN_PUBLIC_URL > WEBHOOK_BASE_URL > PUBLIC_URL > localhost
  return String(
    process.env.KINN_PUBLIC_URL
      || process.env.WEBHOOK_BASE_URL
      || process.env.PUBLIC_URL
      || `http://localhost:${process.env.PORT || 5055}`
  ).replace(/\/+$/, '');
}

module.exports = {
  loadFlow,
  assertMember,
  assertAdminMember,
  findNode,
  ensureHttpTriggerEntry,
  decryptSecrets,
  rotateSecretField,
  rotateTriggerId,
  generateSecret,
  publicBaseUrl,
  syncTriggerIds,
};
