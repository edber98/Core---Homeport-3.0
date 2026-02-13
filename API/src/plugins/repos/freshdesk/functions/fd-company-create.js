const { utils } = require("./utils");

module.exports = {
  async fd_company_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const body = { name: d.name };
    if (d.description) body.description = d.description;
    if (d.domains) body.domains = d.domains.split(",").map(s => s.trim()).filter(Boolean);

    log('Création en cours...');
    const res = await utils.freshdeskRequest(opts, "/companies", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", description: r.description || "", domains: (r.domains || []).join(", "), createdAt: r.created_at || "" };
  }
};
