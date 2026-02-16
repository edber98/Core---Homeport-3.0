const { utils } = require("./utils");

module.exports = {
  async linkedin_get_organization(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const organizationId = (d.organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "Missing organizationId." };

    log('Récupération des données...');
    const res = await utils.linkedinRequest(opts, `/organizations/${encodeURIComponent(organizationId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      name: r.localizedName,
      vanityName: r.vanityName,
      description: r.localizedDescription,
      website: r.localizedWebsite,
      logoUrl: r.logoV2?.original
    };
  }
};
