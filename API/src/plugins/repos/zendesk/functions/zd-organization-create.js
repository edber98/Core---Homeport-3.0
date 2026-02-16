const { utils } = require("./utils");

module.exports = {
  async zd_organization_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const organization = { name: d.name };
    if (d.domainNames) organization.domain_names = d.domainNames.split(",").map(s => s.trim()).filter(Boolean);

    log('Création en cours...');
    const res = await utils.zendeskRequest(opts, "/organizations.json", { method: "POST", body: { organization } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.organization) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", domainNames: (r.domain_names || []).join(", "), createdAt: r.created_at || "" };
  }
};
