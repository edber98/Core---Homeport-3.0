// Radar — résolution de l'acteur système d'un workspace.
// Le radar agit « au nom de » : on rattache contexte et missions au premier
// admin membre du workspace (audit + permissions réelles), à défaut n'importe
// quel membre.

async function resolveSystemActor(workspaceId) {
  const Workspace = require('../db/models/workspace.model');
  const WorkspaceMembership = require('../db/models/workspace-membership.model');
  const ws = await Workspace.findById(workspaceId).lean();
  if (!ws) return null;
  const member = await WorkspaceMembership.findOne({ workspaceId: ws._id, role: 'owner' }).lean()
    || await WorkspaceMembership.findOne({ workspaceId: ws._id }).lean();
  if (!member) return null;
  return { companyId: String(ws.companyId), workspaceId: String(ws._id), userId: String(member.userId) };
}

module.exports = { resolveSystemActor };
