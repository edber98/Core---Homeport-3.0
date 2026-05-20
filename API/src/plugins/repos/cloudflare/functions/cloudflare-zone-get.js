const { utils } = require("./utils");

module.exports = {
  async cloudflare_zone_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };

    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.compactZone(res.data || {}) };
  }
};
