const express = require('express');
const { authMiddleware, requireAdmin } = require('../../auth/jwt');
const { seedMongoIfEmpty } = require('../../seed');
const Company = require('../../db/models/company.model');
const User = require('../../db/models/user.model');
const Workspace = require('../../db/models/workspace.model');
const Flow = require('../../db/models/flow.model');
const Provider = require('../../db/models/provider.model');
const WorkspaceMembership = require('../../db/models/workspace-membership.model');
const App = require('../../db/models/app.model');
const Run = require('../../db/models/run.model');
const NodeTemplate = require('../../db/models/node-template.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());

  r.post('/admin/reset', requireAdmin(), async (_req, res) => {
    await Promise.all([
      Company.deleteMany({}), User.deleteMany({}), Workspace.deleteMany({}), Flow.deleteMany({}),
      Provider.deleteMany({}), NodeTemplate.deleteMany({}), WorkspaceMembership.deleteMany({}), App.deleteMany({}), Run.deleteMany({})
    ]);
    await seedMongoIfEmpty();
    res.json({ ok: true });
  });

  // Trigger tools seed/update explicitly
  r.post('/admin/seed-tools', requireAdmin(), async (_req, res) => {
    try {
      const { seedToolsIfMissing } = require('../../bootstrap/seed-tools');
      await seedToolsIfMissing();
      res.apiOk({ ok: true });
    } catch (e) { res.apiError(500, 'seed_tools_failed', e?.message || 'Seed tools failed'); }
  });

  // (enrich-output-descriptions endpoint removed)

  return r;
}
