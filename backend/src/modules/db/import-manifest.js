const express = require('express');
const { authMiddleware, requireCompanyScope, requireAdmin } = require('../../auth/jwt');
const Provider = require('../../db/models/provider.model');
const NodeTemplate = require('../../db/models/node-template.model');
const { checksumJSON } = require('../../utils/checksum');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());
  r.use(requireAdmin());

  r.post('/plugins/import-manifest', async (req, res) => {
    const { dryRun = false } = req.query;
    const m = req.body || {};
    const summary = { providers: { created: 0, updated: 0, skipped: 0 }, nodeTemplates: { created: 0, updated: 0, skipped: 0 } };

    // Providers
    for (const p of (m.providers || [])){
      const key = p.key; if (!key) continue;
      const checksum = checksumJSON({ key: p.key, name: p.name, categories: p.categories });
      const existing = await Provider.findOne({ key });
      if (!existing){
        if (!dryRun) await Provider.create({ key, name: p.name, categories: p.categories || [], enabled: p.enabled !== false, checksum });
        summary.providers.created++;
      } else if (existing.checksum !== checksum) {
        if (!dryRun){ existing.name = p.name; existing.categories = p.categories || []; existing.enabled = p.enabled !== false; existing.checksum = checksum; await existing.save(); }
        summary.providers.updated++;
      } else { summary.providers.skipped++; }
    }

    // Node templates
    for (const t of (m.nodeTemplates || [])){
      const key = t.key; if (!key) continue;
      const checksumArgs = checksumJSON(t.argsSchema || {});
      const checksumFeature = checksumJSON({ authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, output: t.output || [] });
      const existing = await NodeTemplate.findOne({ key });
      if (!existing){
        if (!dryRun){ await NodeTemplate.create({ key, name: t.name || key, type: t.type, category: t.category || '', argsSchema: t.argsSchema || {}, output: t.output || [], authorize_catch_error: !!t.authorize_catch_error, authorize_skip_error: !!t.authorize_skip_error, checksumArgs, checksumFeature }); }
        summary.nodeTemplates.created++;
      } else if (existing.checksumArgs !== checksumArgs || existing.checksumFeature !== checksumFeature) {
        if (!dryRun){ existing.name = t.name || key; existing.type = t.type; existing.category = t.category || ''; existing.argsSchema = t.argsSchema || {}; existing.output = t.output || []; existing.authorize_catch_error = !!t.authorize_catch_error; existing.authorize_skip_error = !!t.authorize_skip_error; existing.checksumArgs = checksumArgs; existing.checksumFeature = checksumFeature; await existing.save(); }
        summary.nodeTemplates.updated++;
      } else { summary.nodeTemplates.skipped++; }
    }

    res.apiOk(summary);
  });

  return r;
}

