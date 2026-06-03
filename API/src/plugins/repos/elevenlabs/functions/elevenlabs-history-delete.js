const { utils } = require("./utils");

module.exports = {
  async elevenlabs_history_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.historyItemId || "").trim();
    if (!id) return { ok: false, error: "historyItemId requis." };
    const res = await utils.elevenlabsRequest(opts, `/history/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id, status: "deleted", name: "", result_json: utils.compactJson(res.data || {}) };
  }
};
