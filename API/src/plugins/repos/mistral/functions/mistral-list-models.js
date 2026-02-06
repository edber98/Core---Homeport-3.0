const { utils } = require("./utils");

module.exports = {
  async mistral_list_models(node, msg, inputs, opts) {
    const res = await utils.mistralRequest(opts, "/models");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const models = (r.data || []).map(m => ({
      id: m.id,
      object: m.object,
      created: m.created,
      ownedBy: m.owned_by
    }));
    return { ok: true, models };
  }
};
