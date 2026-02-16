const { utils } = require("./utils");

module.exports = {
  async hubspot_company_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const companyId = (d.companyId || "").toString().trim();
    if (!companyId) return { ok: false, error: "Missing companyId." };

    log('Suppression en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/companies/${encodeURIComponent(companyId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Company ${companyId} deleted.` };
  }
};
