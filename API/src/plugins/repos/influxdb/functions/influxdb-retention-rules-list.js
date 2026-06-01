const { utils } = require("./utils");

module.exports = {
  async influxdb_retention_rules_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const bucketId = String(d.bucketId || "").trim();
    if (!bucketId) return { ok: false, error: "bucketId requis." };

    const res = await utils.request((opts && opts.credentials) || {}, "GET", `/api/v2/buckets/${encodeURIComponent(bucketId)}`, undefined, { Accept: "application/json" });
    if (!res.ok) return res;

    let parsed;
    try { parsed = JSON.parse(res.text); } catch { return { ok: false, error: "Réponse JSON invalide." }; }
    const rules = Array.isArray(parsed.retentionRules) ? parsed.retentionRules : [];
    const items = rules.map((r, i) => ({ id: String(i + 1), name: r.type || "expire", status: "ok", properties: r, raw: r }));
    return { ok: true, totalCount: items.length, items, raw: parsed };
  }
};
