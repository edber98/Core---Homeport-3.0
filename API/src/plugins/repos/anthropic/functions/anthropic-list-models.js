const { utils } = require("./utils");

module.exports = {
  async anthropic_list_models(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 20;

    const res = await utils.anthropicRequest(opts, "/models", {
      query: { limit }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const models = (r.data || []).map(m => ({
      id: m.id,
      displayName: m.display_name,
      createdAt: m.created_at,
      type: m.type
    }));
    return { ok: true, models };
  }
};
