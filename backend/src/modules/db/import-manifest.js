const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const { importManifest } = require('../../plugins/importer');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());
  r.use(requireAdmin());

  r.post('/plugins/import-manifest', async (req, res) => {
    const { dryRun = false } = req.query;
    const m = req.body || {};
    const summary = await importManifest(m, { dryRun: dryRun === 'true' });
    res.apiOk(summary);
  });

  return r;
}
