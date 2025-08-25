const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const User = require('../../db/models/user.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

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
    const wsDocs = await Workspace.find({ _id: { $in: wsIds } }).lean();
    const wsMap = new Map(wsDocs.map(w => [String(w._id), (w.id || String(w._id))]));
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
    const { Types } = require('mongoose');
    let u = null;
    if (Types.ObjectId.isValid(id)) u = await User.findById(id).lean();
    if (!u) u = await User.findOne({ email: String(id).toLowerCase(), companyId: req.user.companyId }).lean();
    if (!u || String(u.companyId) !== req.user.companyId) return res.apiError(404, 'user_not_found', 'User not found');
    const memberships = await WorkspaceMembership.find({ userId: u._id }).lean();
    const wsIds = Array.from(new Set(memberships.map(m => String(m.workspaceId))));
    const wsDocs = await Workspace.find({ _id: { $in: wsIds } }).lean();
    const wsMap = new Map(wsDocs.map(w => [String(w._id), (w.id || String(w._id))]));
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
    const role = (body.role === 'admin') ? 'admin' : 'user';
    if (!email) return res.apiError(400, 'email_required', 'Email is required');
    const exists = await User.findOne({ email });
    if (exists) return res.apiError(400, 'email_taken', 'Email already exists');
    const pwdHash = require('../../utils/crypto').hashPassword(body.password || 'changeme');
    const user = await User.create({ email, role, pwdHash, companyId: req.user.companyId });
    // Memberships
    const workspaces = Array.isArray(body.workspaces) ? body.workspaces : [];
    for (const wsId of workspaces){
      const dest = await Workspace.findOne({ $or: [ { _id: wsId }, { id: wsId } ], companyId: req.user.companyId });
      if (dest) await WorkspaceMembership.updateOne({ userId: user._id, workspaceId: dest._id }, { $setOnInsert: { role: 'editor' } }, { upsert: true });
    }
    res.status(201).json({ success: true, data: { id: String(user._id) }, requestId: req.requestId, ts: Date.now() });
  });

  // Update user (role, memberships)
  r.put('/users/:id', requireAdmin(), async (req, res) => {
    const { id } = req.params;
    const { Types } = require('mongoose');
    const uid = Types.ObjectId.isValid(id) ? id : null;
    const user = uid ? await User.findById(uid) : await User.findOne({ email: String(id).toLowerCase(), companyId: req.user.companyId });
    if (!user || String(user.companyId) !== req.user.companyId) return res.apiError(404, 'user_not_found', 'User not found');
    const body = req.body || {};
    if (body.role) user.role = (body.role === 'admin') ? 'admin' : 'user';
    await user.save();
    if (Array.isArray(body.workspaces)){
      const wanted = new Set(String(body.role) === 'admin' ? [] : body.workspaces.map(String));
      const existing = await WorkspaceMembership.find({ userId: user._id }).lean();
      // Remove memberships not wanted
      for (const m of existing){
        const wid = String(m.workspaceId);
        const w = await Workspace.findById(wid);
        const key = w ? (w.id || String(w._id)) : wid;
        if (!wanted.has(key)) await WorkspaceMembership.deleteOne({ _id: m._id });
      }
      // Add missing
      for (const wsKey of Array.from(wanted)){
        const w = await Workspace.findOne({ $or: [ { id: wsKey }, { _id: wsKey } ], companyId: req.user.companyId });
        if (w) await WorkspaceMembership.updateOne({ userId: user._id, workspaceId: w._id }, { $setOnInsert: { role: 'editor' } }, { upsert: true });
      }
    }
    res.apiOk({ id: String(user._id) });
  });

  return r;
}
