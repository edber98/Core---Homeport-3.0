const { utils } = require("./utils");

module.exports = {
  async influxdb_labels_list(node, msg, inputs, opts) {
    const limit = Math.max(1, Math.min(Number((inputs || {}).limit || 100), 500));
    const res = await utils.request((opts && opts.credentials) || {}, "GET", `/api/v2/labels?limit=${limit}`, undefined, { Accept: "application/json" });
    if (!res.ok) return res;

    let parsed;
    try { parsed = JSON.parse(res.text); } catch { return { ok: false, error: "Réponse JSON invalide." }; }
    const labels = Array.isArray(parsed.labels) ? parsed.labels : [];
    const items = labels.map((l) => ({ id: l.id || "", name: l.name || "", status: "ok", properties: l, raw: l }));
    return { ok: true, totalCount: items.length, items, raw: parsed };
  }
};
