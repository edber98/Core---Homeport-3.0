const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Company = require('../../db/models/company.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  async function ensureDefaultWorkspace(companyId, userId){
    try {
      let def = await Workspace.findOne({ companyId, isDefault: true });
      if (!def){
        const c = await Company.findById(companyId).lean();
        const name = (c?.name ? `${c.name} Default` : 'Default');
        def = await Workspace.create({ name, companyId, isDefault: true, templatesAllowed: [] });
        // Ensure membership for current user so default is always visible
        try {
          if (userId) {
            await WorkspaceMembership.updateOne(
              { userId, workspaceId: def._id },
              { $setOnInsert: { role: 'owner' } },
              { upsert: true }
            );
          }
        } catch {}
      }
      // Ensure membership exists even if default already existed
      try {
        if (userId && def?._id) {
          await WorkspaceMembership.updateOne(
            { userId, workspaceId: def._id },
            { $setOnInsert: { role: 'owner' } },
            { upsert: true }
          );
        }
      } catch {}
      return def;
    } catch (e) { return null; }
  }

  r.get('/company', async (req, res) => {
    const c = await Company.findById(req.user.companyId).lean();
    await ensureDefaultWorkspace(req.user.companyId, req.user.id);
    res.apiOk(c || null);
  });

  r.put('/company', async (req, res) => {
    const c = await Company.findById(req.user.companyId);
    if (!c) return res.apiError(404, 'company_not_found', 'Company not found');
    const before = c.toObject();
    const body = req.body || {};
    if (typeof body.name === 'string' && body.name.trim()) c.name = body.name.trim();
    await c.save();
    // Cascade event: notify all workspaces of this company about the update
    try {
      const Workspace = require('../../db/models/workspace.model');
      const Notification = require('../../db/models/notification.model');
      const wss = await Workspace.find({ companyId: req.user.companyId }).lean();
      const notes = wss.map(w => ({
        companyId: c._id,
        workspaceId: w._id,
        entityType: 'company',
        entityId: String(c._id),
        severity: 'info',
        code: 'company_updated',
        message: `Company updated: ${before.name} → ${c.name}`,
      }));
      if (notes.length) await Notification.insertMany(notes);
    } catch {}
    res.apiOk(c);
  });

  r.get('/workspaces', async (req, res) => {
    await ensureDefaultWorkspace(req.user.companyId, req.user.id);
    const memberships = await WorkspaceMembership.find({ userId: req.user.id }).lean();
    const ids = memberships.map(m => m.workspaceId);
    let { limit = 50, page = 1 } = req.query;
    limit = Math.max(1, Math.min(100, Number(limit) || 50));
    page = Math.max(1, Number(page) || 1);
    const { q, sort } = req.query;
    const query = { _id: { $in: ids } };
    if (q) query['name'] = { $regex: String(q), $options: 'i' };
    let sortObj = { createdAt: -1 };
    if (typeof sort === 'string') {
      const [field, dir] = String(sort).split(':');
      if (field) sortObj = { [field]: (dir === 'asc' ? 1 : -1) };
    }
    const list = await Workspace.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.apiOk(list);
  });
  return r;
}
