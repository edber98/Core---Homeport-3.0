const express = require('express');
const { Types } = require('mongoose');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const User = require('../../db/models/user.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  async function findWorkspaceForCompany(companyId, wsKey) {
    const key = String(wsKey || '');
    if (!key) return null;
    if (Types.ObjectId.isValid(key)) {
      const byObjectId = await Workspace.findOne({ _id: key, companyId });
      if (byObjectId) return byObjectId;
    }
    return Workspace.findOne({ id: key, companyId });
  }

  async function findFallbackWorkspaceForCompany(companyId) {
    const def = await Workspace.findOne({ companyId, isDefault: true });
    if (def) return def;
    return Workspace.findOne({ companyId }).sort({ createdAt: 1 });
  }

  async function listCompanyWorkspaces(companyId) {
    return Workspace.find({ companyId }).sort({ isDefault: -1, createdAt: 1 });
  }

  async function ensureAdminMembershipsOnAllWorkspaces(userId, companyId) {
    const workspaces = await listCompanyWorkspaces(companyId);
    for (const ws of workspaces) {
      await WorkspaceMembership.updateOne(
        { userId, workspaceId: ws._id },
        { $setOnInsert: { role: 'editor' } },
        { upsert: true }
      );
    }
    return workspaces;
  }

  async function ensureMemberWorkspace(userId, companyId, preferredKeys = []) {
    // Try preferred workspaces first (typically payload from UI)
    for (const wsKey of preferredKeys) {
      const dest = await findWorkspaceForCompany(companyId, wsKey);
      if (!dest) continue;
      await WorkspaceMembership.updateOne(
        { userId, workspaceId: dest._id },
        { $setOnInsert: { role: 'editor' } },
        { upsert: true }
      );
      return dest._id;
    }

    // Fallback to default workspace (or first company workspace)
    const fallback = await findFallbackWorkspaceForCompany(companyId);
    if (!fallback) return null;
    await WorkspaceMembership.updateOne(
      { userId, workspaceId: fallback._id },
      { $setOnInsert: { role: 'editor' } },
      { upsert: true }
    );
    return fallback._id;
  }

  async function resolveTargetWorkspaces(companyId, workspaceKeys = []) {
    const out = [];
    const seen = new Set();
    for (const key of workspaceKeys) {
      const ws = await findWorkspaceForCompany(companyId, key);
      if (!ws) continue;
      const id = String(ws._id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(ws);
    }
    return out;
  }

  // List company users with pagination and search
  r.get('/users', async (req, res) => {
    let { page = 1, limit = 50, sort = 'createdAt:desc', q } = req.query;
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Math.min(200, Number(limit) || 50));
    const rx = q ? { $regex: String(q), $options: 'i' } : null;
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') { const [f,d] = String(sort).split(':'); if (f) sortObj = { [f]: (d === 'asc' ? 1 : -1) }; }
    const filter = { companyId: req.user.companyId };
    if (rx) Object.assign(filter, { $or: [ { email: rx } ] });
    const users = await User.find(filter).sort(sortObj).skip((page-1)*limit).limit(limit).lean();
    const total = await User.countDocuments(filter);
    const uids = users.map(u => u._id);
    const memberships = await WorkspaceMembership.find({ userId: { $in: uids } }).lean();
    const wsIds = Array.from(new Set(memberships.map(m => String(m.workspaceId))));
    const wsObjectIds = wsIds.filter(id => Types.ObjectId.isValid(id));
    const wsCustomIds = wsIds.filter(id => !Types.ObjectId.isValid(id));
    const wsByObjectId = wsObjectIds.length ? await Workspace.find({ _id: { $in: wsObjectIds } }).lean() : [];
    const wsByCustomId = wsCustomIds.length ? await Workspace.find({ id: { $in: wsCustomIds }, companyId: req.user.companyId }).lean() : [];
    const wsMap = new Map();
    for (const w of [...wsByObjectId, ...wsByCustomId]) {
      const resolved = (w.id || String(w._id));
      wsMap.set(String(w._id), resolved);
      if (w.id) wsMap.set(String(w.id), resolved);
    }
    const data = users.map(u => ({
      id: String(u._id),
      email: u.email,
      name: (u.email && String(u.email).split('@')[0]) || 'user',
      role: u.role === 'admin' ? 'admin' : 'member',
      workspaces: memberships.filter(m => String(m.userId) === String(u._id)).map(m => wsMap.get(String(m.workspaceId)) || String(m.workspaceId)),
    }));
    res.apiOk({ total, page, limit, items: data });
  });

  // Get one user
  r.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    let u = null;
    if (Types.ObjectId.isValid(id)) u = await User.findById(id).lean();
    if (!u) u = await User.findOne({ email: String(id).toLowerCase(), companyId: req.user.companyId }).lean();
    if (!u || String(u.companyId) !== req.user.companyId) return res.apiError(404, 'user_not_found', 'User not found');
    const memberships = await WorkspaceMembership.find({ userId: u._id }).lean();
    const wsIds = Array.from(new Set(memberships.map(m => String(m.workspaceId))));
    const wsObjectIds = wsIds.filter(x => Types.ObjectId.isValid(x));
    const wsCustomIds = wsIds.filter(x => !Types.ObjectId.isValid(x));
    const wsByObjectId = wsObjectIds.length ? await Workspace.find({ _id: { $in: wsObjectIds } }).lean() : [];
    const wsByCustomId = wsCustomIds.length ? await Workspace.find({ id: { $in: wsCustomIds }, companyId: req.user.companyId }).lean() : [];
    const wsMap = new Map();
    for (const w of [...wsByObjectId, ...wsByCustomId]) {
      const resolved = (w.id || String(w._id));
      wsMap.set(String(w._id), resolved);
      if (w.id) wsMap.set(String(w.id), resolved);
    }
    const data = {
      id: String(u._id),
      email: u.email,
      name: (u.email && String(u.email).split('@')[0]) || 'user',
      role: u.role === 'admin' ? 'admin' : 'member',
      workspaces: memberships.map(m => wsMap.get(String(m.workspaceId)) || String(m.workspaceId))
    };
    res.apiOk(data);
  });

  // Create user (admin)
  r.post('/users', requireAdmin(), async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase();
    // Enum User : admin | editor | viewer. 'user' (legacy) → 'editor'.
    const role = ['admin', 'editor', 'viewer'].includes(body.role) ? body.role : 'editor';
    if (!email) return res.apiError(400, 'email_required', 'Email is required');
    const exists = await User.findOne({ email });
    if (exists) return res.apiError(400, 'email_taken', 'Email already exists');
    const pwdHash = require('../../utils/crypto').hashPassword(body.password || 'changeme');

    // Resolve memberships before creating the user (prevents broken user rows)
    let targetWorkspaces = [];
    if (role === 'admin') {
      targetWorkspaces = await listCompanyWorkspaces(req.user.companyId);
    } else {
      const requested = Array.isArray(body.workspaces) ? body.workspaces.map(String).filter(Boolean) : [];
      targetWorkspaces = await resolveTargetWorkspaces(req.user.companyId, requested);
      if (targetWorkspaces.length === 0) {
        const fallback = await findFallbackWorkspaceForCompany(req.user.companyId);
        if (fallback) targetWorkspaces.push(fallback);
      }
    }
    if (targetWorkspaces.length === 0) {
      return res.apiError(400, 'workspace_required', 'No workspace available for this company');
    }

    const user = await User.create({
      email,
      role,
      pwdHash,
      companyId: req.user.companyId,
      defaultWorkspaceId: targetWorkspaces[0]._id,
    });

    // Persist memberships (at least one guaranteed for all roles)
    for (const ws of targetWorkspaces) {
      await WorkspaceMembership.updateOne(
        { userId: user._id, workspaceId: ws._id },
        { $setOnInsert: { role: 'editor' } },
        { upsert: true }
      );
    }
    res.status(201).json({ success: true, data: { id: String(user._id) }, requestId: req.requestId, ts: Date.now() });
  });

  // Update user (role, memberships)
  r.put('/users/:id', requireAdmin(), async (req, res) => {
    const { id } = req.params;
    const uid = Types.ObjectId.isValid(id) ? id : null;
    const user = uid ? await User.findById(uid) : await User.findOne({ email: String(id).toLowerCase(), companyId: req.user.companyId });
    if (!user || String(user.companyId) !== req.user.companyId) return res.apiError(404, 'user_not_found', 'User not found');
    const body = req.body || {};
    if (body.role) user.role = ['admin', 'editor', 'viewer'].includes(body.role) ? body.role : 'editor';
    await user.save();
    let adminWorkspaces = null;
    if (user.role === 'admin') {
      adminWorkspaces = await ensureAdminMembershipsOnAllWorkspaces(user._id, req.user.companyId);
      if (adminWorkspaces.length === 0) {
        return res.apiError(400, 'workspace_required', 'No workspace available for this company');
      }
    } else if (Array.isArray(body.workspaces)){
      const wantedKeys = body.workspaces.map(String).filter(Boolean);
      // Prevent empty-membership state for all users
      if (wantedKeys.length === 0) {
        const fallback = await findFallbackWorkspaceForCompany(req.user.companyId);
        if (fallback) wantedKeys.push(fallback.id || String(fallback._id));
      }
      if (wantedKeys.length === 0) {
        return res.apiError(400, 'workspace_required', 'No workspace available for this company');
      }
      const wanted = new Set(wantedKeys);
      const existing = await WorkspaceMembership.find({ userId: user._id }).lean();
      // Remove memberships not wanted
      for (const m of existing){
        const wid = String(m.workspaceId);
        const w = await findWorkspaceForCompany(req.user.companyId, wid);
        const key = w ? (w.id || String(w._id)) : wid;
        if (!wanted.has(key)) await WorkspaceMembership.deleteOne({ _id: m._id });
      }
      // Add missing
      for (const wsKey of Array.from(wanted)){
        const w = await findWorkspaceForCompany(req.user.companyId, wsKey);
        if (w) await WorkspaceMembership.updateOne({ userId: user._id, workspaceId: w._id }, { $setOnInsert: { role: 'editor' } }, { upsert: true });
      }
    }

    // Keep default workspace aligned with effective memberships
    let nextDefaultWorkspaceId = null;
    if (user.role === 'admin') {
      if (!adminWorkspaces) adminWorkspaces = await listCompanyWorkspaces(req.user.companyId);
      if (!adminWorkspaces.length) {
        return res.apiError(400, 'workspace_required', 'No workspace available for this company');
      }
      nextDefaultWorkspaceId = adminWorkspaces[0]._id;
    } else {
      let firstMembership = await WorkspaceMembership.findOne({ userId: user._id }).sort({ createdAt: 1 }).lean();
      if (!firstMembership) {
        const ensured = await ensureMemberWorkspace(user._id, req.user.companyId, []);
        if (ensured) firstMembership = { workspaceId: ensured };
      }
      nextDefaultWorkspaceId = firstMembership?.workspaceId || null;
    }
    await User.updateOne(
      { _id: user._id },
      { $set: { defaultWorkspaceId: nextDefaultWorkspaceId } }
    );
    res.apiOk({ id: String(user._id) });
  });

  return r;
}
