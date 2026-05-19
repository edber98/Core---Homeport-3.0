const { utils } = require("./utils");

module.exports = {
  async home_assistant_state_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const entityId = String(d.entityId || "").trim();
    if (!entityId) return { ok: false, error: "ID entité requis." };
    log("Récupération de l'état...");
    const res = await utils.homeAssistantRequest(opts, `/api/states/${encodeURIComponent(entityId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapState(res.data) };
  }
};
