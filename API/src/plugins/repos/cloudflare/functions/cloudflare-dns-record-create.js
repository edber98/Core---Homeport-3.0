const { utils } = require("./utils");

module.exports = {
  async cloudflare_dns_record_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const zoneId = String(d.zoneId || "").trim();
    const type = String(d.type || "").trim().toUpperCase();
    const name = String(d.name || "").trim();
    const content = String(d.content || "").trim();
    if (!zoneId) return { ok: false, error: "ID de zone requis." };
    if (!type) return { ok: false, error: "Type DNS requis." };
    if (!name) return { ok: false, error: "Nom DNS requis." };
    if (!content) return { ok: false, error: "Contenu DNS requis." };

    const body = { type, name, content };
    if (d.ttl !== undefined && d.ttl !== "") body.ttl = parseInt(d.ttl, 10);
    if (d.proxied !== undefined && d.proxied !== "") body.proxied = utils.parseBoolean(d.proxied);
    if (d.comment) body.comment = String(d.comment);
    if (d.priority !== undefined && d.priority !== "") body.priority = parseInt(d.priority, 10);
    if (d.data) {
      try { body.data = utils.parseJsonInput(d.data, "Données avancées"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Création de l'enregistrement DNS...");
    const res = await utils.cloudflareRequest(opts, `/zones/${encodeURIComponent(zoneId)}/dns_records`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDnsRecord(res.data || {}) };
  }
};
