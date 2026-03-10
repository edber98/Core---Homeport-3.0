const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const Flow = require('../../db/models/flow.model');
const Notification = require('../../db/models/notification.model');
const { validateFlowGraph } = require('../../utils/validate');
const NodeTemplate = require('../../db/models/node-template.model');
const User = require('../../db/models/user.model');

// Helper: resolve workspace by _id or custom id, scoped to company
async function resolveWorkspace(wsId, companyId) {
  const { Types } = require('mongoose');
  const id = String(wsId || '');
  const ws = Types.ObjectId.isValid(id)
    ? await Workspace.findById(id)
    : await Workspace.findOne({ id });
  if (!ws || String(ws.companyId) !== companyId) return null;
  return ws;
}

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  // ===== Static routes FIRST (before :wsId param routes) =====

  // POST /workspaces — Create a new workspace (admin only)
  r.post('/workspaces', requireAdmin(), async (req, res) => {
    const body = req.body || {};
    const name = (body.name || '').trim();
    if (!name) return res.apiError(400, 'name_required', 'Workspace name is required');

    const ws = await Workspace.create({
      name,
      companyId: req.user.companyId,
      isDefault: false,
      templatesAllowed: Array.isArray(body.templatesAllowed) ? body.templatesAllowed : [],
    });

    // Auto-add all company admins so admin access is global on workspace-scoped routes.
    const admins = await User.find({ companyId: req.user.companyId, role: 'admin' }).select('_id').lean();
    for (const admin of admins) {
      await WorkspaceMembership.updateOne(
        { userId: admin._id, workspaceId: ws._id },
        { $setOnInsert: { role: 'editor' } },
        { upsert: true }
      );
    }
    // Creator keeps owner role on this workspace.
    await WorkspaceMembership.updateOne(
      { userId: req.user.id, workspaceId: ws._id },
      { $set: { role: 'owner' } },
      { upsert: true }
    );

    res.apiOk(ws);
  });

  // PUT /workspaces/preference — Set user's default workspace
  r.put('/workspaces/preference', async (req, res) => {
    const { workspaceId } = req.body || {};
    if (!workspaceId) return res.apiError(400, 'workspace_id_required', 'workspaceId is required');

    const ws = await resolveWorkspace(workspaceId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    // Verify user is member or admin
    if (req.user.role !== 'admin') {
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'You are not a member of this workspace');
    }

    await User.updateOne({ _id: req.user.id }, { $set: { defaultWorkspaceId: ws._id } });
    res.apiOk({ defaultWorkspaceId: String(ws._id) });
  });

  // GET /workspaces/preference — Get user's default workspace
  r.get('/workspaces/preference', async (req, res) => {
    const user = await User.findById(req.user.id).lean();
    res.apiOk({ defaultWorkspaceId: user?.defaultWorkspaceId ? String(user.defaultWorkspaceId) : null });
  });

  // ===== Parameterized routes (:wsId) =====

  // PUT /workspaces/:wsId — Update a workspace
  r.put('/workspaces/:wsId', async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    const patch = req.body || {};
    const force = !!patch.force;

    // If templatesAllowed changes, detect impacted flows
    const updatingAllowed = Array.isArray(patch.templatesAllowed);
    let impacted = [];
    if (updatingAllowed) {
      const newAllowed = patch.templatesAllowed;
      const flows = await Flow.find({ workspaceId: ws._id });
      const loaders = {
        getTemplateByKey: async (key) => NodeTemplate.findOne({ key }).lean(),
        isTemplateAllowed: async (key) => newAllowed.length === 0 || newAllowed.includes(key),
      };
      for (const f of flows) {
        const v = await validateFlowGraph(f.graph || f, { strict: true, loaders });
        if (!v.ok) impacted.push({ flowId: String(f._id), errors: v.errors, name: f.name });
      }
      if (impacted.length && !force) {
        return res.apiError(400, 'workspace_policy_violation', 'Some flows would become invalid', { impacted });
      }
      if (impacted.length && force) {
        for (const it of impacted) {
          const f = await Flow.findById(it.flowId);
          f.enabled = false; await f.save();
          await Notification.create({ companyId: ws.companyId, workspaceId: ws._id, entityType: 'flow', entityId: it.flowId, severity: 'critical', code: 'template_not_allowed', message: `Flow désactivé en raison de la politique de templates du workspace`, details: { errors: it.errors }, link: `/flows/${it.flowId}/editor` });
        }
      }
    }

    // Apply allowed fields (prevent overwriting companyId/isDefault via patch)
    if (typeof patch.name === 'string' && patch.name.trim()) ws.name = patch.name.trim();
    if (updatingAllowed) ws.templatesAllowed = patch.templatesAllowed;

    await ws.save();
    res.apiOk({ workspace: ws, impacted });
  });

  // DELETE /workspaces/:wsId — Delete a workspace (admin only)
  r.delete('/workspaces/:wsId', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');
    if (ws.isDefault) return res.apiError(400, 'cannot_delete_default', 'Cannot delete the default workspace');

    // Check if workspace has resources
    const flowCount = await Flow.countDocuments({ workspaceId: ws._id });
    const force = !!(req.query.force || req.body?.force);
    if (flowCount > 0 && !force) {
      return res.apiError(400, 'workspace_not_empty', 'Workspace still has flows. Use ?force=1 to delete anyway.', { flowCount });
    }

    // If force: move remaining flows to default workspace
    if (flowCount > 0 && force) {
      const defaultWs = await Workspace.findOne({ companyId: req.user.companyId, isDefault: true });
      if (defaultWs) {
        await Flow.updateMany({ workspaceId: ws._id }, { $set: { workspaceId: defaultWs._id } });
      }
    }

    // Remove all memberships for this workspace
    await WorkspaceMembership.deleteMany({ workspaceId: ws._id });

    // Remove default workspace preference from users that had this workspace as default
    await User.updateMany(
      { companyId: req.user.companyId, defaultWorkspaceId: ws._id },
      { $unset: { defaultWorkspaceId: '' } }
    );

    await Workspace.deleteOne({ _id: ws._id });
    res.apiOk({ deleted: true });
  });

  // GET /workspaces/:wsId/elements — Aggregate workspace resources
  r.get('/workspaces/:wsId/elements', async (req, res) => {
    const Form = require('../../db/models/form.model');
    const Credential = require('../../db/models/credential.model');
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    // Admin can see all; non-admin must be member
    if (req.user.role !== 'admin') {
      const member = await WorkspaceMembership.findOne({ userId: req.user.id, workspaceId: ws._id });
      if (!member) return res.apiError(403, 'not_a_member', 'User not a workspace member');
    }

    const [flows, creds, forms] = await Promise.all([
      Flow.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(500).lean(),
      Credential.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(500).select('-secret').lean(),
      Form.find({ workspaceId: ws._id }).sort({ createdAt: -1 }).limit(500).lean(),
    ]);
    res.apiOk({
      flows: (flows || []).map(f => ({ id: String(f._id), name: f.name })),
      credentials: (creds || []).map(c => ({ id: String(c._id), name: c.name, providerKey: c.providerKey })),
      forms: (forms || []).map(f => ({ id: String(f._id), name: f.name })),
      websites: [],
    });
  });

  // ===== Members =====

  // GET /workspaces/:wsId/members — List workspace members
  r.get('/workspaces/:wsId/members', async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    const memberships = await WorkspaceMembership.find({ workspaceId: ws._id }).lean();
    const userIds = memberships.map(m => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('-pwdHash').lean();
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const members = memberships.map(m => {
      const u = userMap.get(String(m.userId)) || {};
      return {
        userId: String(m.userId),
        email: u.email || '',
        role: m.role,
        joinedAt: m.createdAt,
      };
    });
    res.apiOk(members);
  });

  // POST /workspaces/:wsId/members — Add a member (admin only)
  r.post('/workspaces/:wsId/members', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    const { userId, email, role } = req.body || {};
    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: String(email).toLowerCase() });
    }
    if (!targetUser || String(targetUser.companyId) !== req.user.companyId) {
      return res.apiError(404, 'user_not_found', 'User not found in this company');
    }

    const memberRole = ['owner', 'editor', 'viewer'].includes(role) ? role : 'editor';
    await WorkspaceMembership.updateOne(
      { userId: targetUser._id, workspaceId: ws._id },
      { $set: { role: memberRole } },
      { upsert: true }
    );

    res.apiOk({ userId: String(targetUser._id), email: targetUser.email, role: memberRole });
  });

  // PATCH /workspaces/:wsId/members/:userId — Update member role (admin only)
  r.patch('/workspaces/:wsId/members/:userId', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    const { role } = req.body || {};
    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.apiError(400, 'invalid_role', 'Role must be owner, editor, or viewer');
    }

    const result = await WorkspaceMembership.updateOne(
      { userId: req.params.userId, workspaceId: ws._id },
      { $set: { role } }
    );
    if (result.matchedCount === 0) return res.apiError(404, 'member_not_found', 'Member not found');
    res.apiOk({ updated: true });
  });

  // DELETE /workspaces/:wsId/members/:userId — Remove a member (admin only)
  r.delete('/workspaces/:wsId/members/:userId', requireAdmin(), async (req, res) => {
    const ws = await resolveWorkspace(req.params.wsId, req.user.companyId);
    if (!ws) return res.apiError(404, 'workspace_not_found', 'Workspace not found');

    const result = await WorkspaceMembership.deleteOne({
      userId: req.params.userId,
      workspaceId: ws._id,
    });
    if (result.deletedCount === 0) return res.apiError(404, 'member_not_found', 'Member not found');
    res.apiOk({ removed: true });
  });

  return r;
}
