const { utils } = require("./utils");

module.exports = {
  async home_assistant_states_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const domain = String(d.domain || "").trim().toLowerCase();
    const limit = utils.toPositiveInt(d.pageSize, 100, 1000);
    log("Récupération des états...");
    const res = await utils.homeAssistantRequest(opts, "/api/states");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawStates = Array.isArray(res.data) ? res.data : [];
    const states = rawStates
      .filter((state) => !domain || String(state.entity_id || "").toLowerCase().startsWith(`${domain}.`))
      .slice(0, limit)
      .map(utils.mapState);
    return { ok: true, states, totalCount: states.length };
  }
};
