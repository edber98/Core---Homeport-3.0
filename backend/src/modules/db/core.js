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
    const list = await Workspace.find({ _id: { $in: ids } }).lean();
    res.apiOk(list);
  });
  return r;
}
