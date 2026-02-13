const { utils } = require("./utils");

module.exports = {
  async anthropic_get_model(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const modelId = (d.modelId || "").trim();
    if (!modelId) return { ok: false, error: "Missing modelId." };

    log('Récupération des données...');
    const res = await utils.anthropicRequest(opts, `/models/${encodeURIComponent(modelId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const m = res.data || {};
    return {
      ok: true,
      id: m.id,
      displayName: m.display_name,
      createdAt: m.created_at,
      type: m.type
    };
  }
};
