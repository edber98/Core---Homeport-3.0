const { utils } = require("./utils");

module.exports = {
  async elevenlabs_history_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== "") query.page_size = d.pageSize;
    if (d.startAfterHistoryItemId) query.start_after_history_item_id = String(d.startAfterHistoryItemId);
    if (d.voiceId) query.voice_id = String(d.voiceId);
    const res = await utils.elevenlabsRequest(opts, "/history", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = Array.isArray(res.data?.history) ? res.data.history : [];
    const items = rawItems.map((r) => ({ id: r.history_item_id || "", name: r.voice_name || r.model_id || "", status: r.state || "", result_json: utils.compactJson(r) }));
    return { ok: true, items, totalCount: items.length, nextCursor: res.data?.last_history_item_id || "" };
  }
};
