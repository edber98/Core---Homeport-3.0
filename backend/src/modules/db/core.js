const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Company = require('../../db/models/company.model');
const Workspace = require('../../db/models/workspace.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/company', async (req, res) => {
    const c = await Company.findById(req.user.companyId).lean();
    res.apiOk(c || null);
  });

  r.get('/workspaces', async (req, res) => {
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
