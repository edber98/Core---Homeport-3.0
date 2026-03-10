const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const { importManifest } = require('../../plugins/importer');
const { toolIndex } = require('../../ai/tools/tool-index');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.post('/plugins/import-manifest', requireAdmin(), async (req, res) => {
    const { dryRun = false } = req.query;
    const m = req.body || {};
    const summary = await importManifest(m, { dryRun: dryRun === 'true' });
    // Rebuild AI tool index after import so new providers/templates are searchable
    if (dryRun !== 'true') {
      toolIndex.rebuild().catch(e => console.error('[import-manifest] toolIndex rebuild error:', e?.message));
    }
    res.apiOk(summary);
  });

  return r;
}
