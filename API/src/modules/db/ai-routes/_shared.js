// Shared helpers et state pour toutes les routes AI (ai.js + sous-routeurs ai-routes/*).
//
// - activeStreams : map `threadId → res` pour les SSE actifs (POST /messages stream)
//   Sert au cancel : si l'utilisateur cancel, on récupère le res en cours pour le fermer.
//
// - findThread(id) : résout un AiThread par _id (ObjectId) ou par champ `id` (custom).
//
// - ensureWorkspaceAccess(req, res) : vérifie x-workspace-id ou workspaceId, charge le ws,
//   vérifie company + membership (sauf admin). Renvoie le ws ou null après apiError.

const { Types } = require('mongoose');
const AiThread = require('../../../db/models/ai-thread.model');
const Workspace = require('../../../db/models/workspace.model');
const WorkspaceMembership = require('../../../db/models/workspace-membership.model');

// Active SSE streams — keyed by threadId string. Module-level (singleton).
const activeStreams = new Map();

async function findThread(tid) {
  const id = String(tid);
  if (Types.ObjectId.isValid(id)) {
    const t = await AiThread.findById(id);
    if (t) return t;
  }
  return AiThread.findOne({ id });
}

async function ensureWorkspaceAccess(req, res) {
  const wsId = req.headers['x-workspace-id'] || req.query.workspaceId;
  if (!wsId) {
    res.apiError(400, 'missing_workspace', 'workspaceId required');
    return null;
  }
  const id = String(wsId);
  const ws = Types.ObjectId.isValid(id)
    ? await Workspace.findById(id)
    : await Workspace.findOne({ id });
  if (!ws || String(ws.companyId) !== req.user.companyId) {
    res.apiError(404, 'workspace_not_found', 'Workspace not found');
    return null;
  }
  if (req.user.role !== 'admin') {
    const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
    if (!member) {
      res.apiError(403, 'not_a_member', 'Not a workspace member');
      return null;
    }
  }
  return ws;
}

module.exports = { activeStreams, findThread, ensureWorkspaceAccess };
