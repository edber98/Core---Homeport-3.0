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
async function ensureHttpTriggerEntry(flow, nodeId, { autoCreate = true } = {}) {
  flow.httpTriggers = flow.httpTriggers || {};
  let entry = flow.httpTriggers[nodeId];
  if (!entry && autoCreate) {
    const triggerId = newId('htg');
    const secrets = {
      token: generateSecret(40),
      password: generateSecret(24),
      hmacSecret: generateSecret(32),
    };
    entry = {
      triggerId,
      encryptedAuth: encrypt(secrets),
      createdAt: new Date(),
      rotatedAt: null,
    };
    flow.httpTriggers[nodeId] = entry;
    flow.markModified('httpTriggers');
    syncTriggerIds(flow);
    await flow.save();
  }
  return entry;
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

// Regenère un secret précis dans le bundle chiffré sans toucher aux autres
async function rotateSecretField(flow, nodeId, secretKey) {
  const entry = await ensureHttpTriggerEntry(flow, nodeId);
  const secrets = decryptSecrets(entry);
  secrets[secretKey] = generateSecret(secretKey === 'token' ? 40 : 32);
  entry.encryptedAuth = encrypt(secrets);
  entry.rotatedAt = new Date();
  flow.httpTriggers[nodeId] = entry;
  flow.markModified('httpTriggers');
  await flow.save();
  return secrets[secretKey];
}

async function rotateTriggerId(flow, nodeId) {
  const entry = await ensureHttpTriggerEntry(flow, nodeId);
  entry.triggerId = newId('htg');
  entry.rotatedAt = new Date();
  flow.httpTriggers[nodeId] = entry;
  flow.markModified('httpTriggers');
  syncTriggerIds(flow);
  await flow.save();
  return entry.triggerId;
}

function publicBaseUrl() {
  return String(
    process.env.KINN_PUBLIC_URL
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
