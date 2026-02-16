const { utils } = require("./utils");

module.exports = {
  async zd_organization_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const orgId = parseInt(d.orgId, 10);
    if (isNaN(orgId)) return { ok: false, error: "Missing orgId." };

    log('Récupération des données...');
    const res = await utils.zendeskRequest(opts, `/organizations/${orgId}.json`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.organization) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", domainNames: (r.domain_names || []).join(", "), createdAt: r.created_at || "" };
  }
};
