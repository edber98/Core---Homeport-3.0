const { utils } = require("./utils");

module.exports = {
  async cloudflare_dns_record_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    const recordId = String(d.recordId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };
    if (!recordId) return { ok: false, error: "ID d'enregistrement requis." };

    log("Suppression de l'enregistrement DNS...");
    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || recordId, success: true };
  }
};
