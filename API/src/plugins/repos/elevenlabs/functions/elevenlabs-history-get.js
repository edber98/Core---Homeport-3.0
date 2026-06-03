const { utils } = require("./utils");

module.exports = {
  async elevenlabs_history_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.historyItemId || "").trim();
    if (!id) return { ok: false, error: "historyItemId requis." };
    const res = await utils.elevenlabsRequest(opts, `/history/${encodeURIComponent(id)}`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id, status: r.state || "", name: r.voice_name || r.model_id || "", text: r.text || "", result_json: utils.compactJson(r) };
  }
};
