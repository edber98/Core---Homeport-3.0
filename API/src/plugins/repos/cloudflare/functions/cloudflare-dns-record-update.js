const { utils } = require("./utils");

module.exports = {
  async cloudflare_dns_record_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    const recordId = String(d.recordId || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };
    if (!recordId) return { ok: false, error: "ID d'enregistrement requis." };

    const body = {};
    if (d.type) body.type = String(d.type).trim().toUpperCase();
    if (d.name) body.name = String(d.name).trim();
    if (d.content) body.content = String(d.content).trim();
    if (d.ttl !== undefined && d.ttl !== "") body.ttl = parseInt(d.ttl, 10);
    if (d.proxied !== undefined && d.proxied !== "") body.proxied = utils.parseBoolean(d.proxied);
    if (d.comment !== undefined) body.comment = String(d.comment || "");
    if (d.priority !== undefined && d.priority !== "") body.priority = parseInt(d.priority, 10);
    if (d.data) {
      try { body.data = utils.parseJsonInput(d.data, "Données avancées"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ DNS à modifier." };

    log("Mise à jour de l'enregistrement DNS...");
    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDnsRecord(res.data || {}) };
  }
};
