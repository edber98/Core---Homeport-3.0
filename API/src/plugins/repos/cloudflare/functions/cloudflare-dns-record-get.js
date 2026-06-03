const { utils } = require("./utils");

module.exports = {
  async cloudflare_dns_record_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    const recordId = String(d.recordId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };
    if (!recordId) return { ok: false, error: "ID enregistrement requis." };

    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDnsRecord(res.data || {}) };
  }
};
