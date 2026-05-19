const { utils } = require("./utils");

module.exports = {
  async home_assistant_history_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const startTime = String(d.startTime || "").trim();
    const endTime = String(d.endTime || "").trim();
    const entityIds = String(d.entityIds || "").trim();
    const limit = utils.toPositiveInt(d.pageSize, 100, 1000);
    const path = startTime ? `/api/history/period/${encodeURIComponent(startTime)}` : "/api/history/period";
    const query = {
      end_time: endTime,
      filter_entity_id: entityIds,
      minimal_response: true
    };

    log("Lecture de l'historique...");
    const res = await utils.homeAssistantRequest(opts, path, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const changes = utils.flattenHistory(res.data, limit);
    return { ok: true, changes, totalCount: changes.length };
  }
};
