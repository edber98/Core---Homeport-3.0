// Routes /ai/tools/* — recherche + détail des NodeTemplates exposés à l'agent.
//
//   GET /ai/tools           recherche (q, provider, category, limit)
//   GET /ai/tools/:key      détail complet d'un NodeTemplate (args + output schema)

const { toolIndex } = require('../../../ai/tools/tool-index');
const NodeTemplate = require('../../../db/models/node-template.model');
const { argsToJsonSchema, extractOutputSchema } = require('../../../ai/tools/tool-converter');

module.exports = function registerToolRoutes(r) {
  // ── Search tools ───────────────────────────────────────────────────
  r.get('/ai/tools', async (req, res) => {
    await toolIndex.ensureBuilt();
    const results = toolIndex.search(req.query.q || '', {
      provider: req.query.provider,
      category: req.query.category,
      limit: parseInt(req.query.limit || '20', 10),
    });
    res.apiOk(results);
  });

  // ── Tool details ───────────────────────────────────────────────────
  r.get('/ai/tools/:key', async (req, res) => {
    const tpl = await NodeTemplate.findOne({ key: req.params.key }).lean();
    if (!tpl) return res.apiError(404, 'template_not_found', 'Template not found');
    res.apiOk({
      key: tpl.key,
      name: tpl.title || tpl.name,
      description: tpl.description || '',
      type: tpl.type,
      provider: tpl.providerKey || null,
      argsSchema: tpl.args ? argsToJsonSchema(tpl.args) : null,
      outputSchema: extractOutputSchema(tpl),
      // Champs requis par NodeExecResultDialogComponent pour le rendu schema-based
      outputSchemas: tpl.outputSchemas || null,
      outputHandles: tpl.outputHandles || null,
      output_array_field: tpl.output_array_field || null,
      output_schema_field: tpl.output_schema_field || null,
      output_schema_merge_at: tpl.output_schema_merge_at || null,
    });
  });
};
