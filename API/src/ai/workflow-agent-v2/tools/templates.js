module.exports = function(ctx){
  return {
    async get_templates_v2(){
      try {
        const NodeTemplate = require('../../../db/models/node-template.model');
        const list = await NodeTemplate.find({ enabled: true }).lean();
        const items = (list || []).map(t => ({
          key: t.key,
          name: t.name,
          title: t.title || t.name,
          type: t.type,
          category: t.category,
          providerKey: t.providerKey,
          args: t.args || {},
          inputHandles: Array.isArray(t.inputHandles) ? t.inputHandles : undefined,
          outputHandles: Array.isArray(t.outputHandles) ? t.outputHandles : undefined,
          linkedHandles: Array.isArray(t.linkedHandles) ? t.linkedHandles : undefined,
          authorize_catch_error: !!t.authorize_catch_error,
          authorize_skip_error: !!t.authorize_skip_error,
        }));
        return { success: true, templates: items };
      } catch (e) { return { success: false, error: 'templates_failed', message: String(e?.message || e) }; }
    },
  };
}

