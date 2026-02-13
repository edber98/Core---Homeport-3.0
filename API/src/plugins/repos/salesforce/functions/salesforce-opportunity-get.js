const { utils } = require("./utils");

module.exports = {
  async salesforce_opportunity_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const opportunityId = (d.opportunityId || "").toString().trim();
    if (!opportunityId) return { ok: false, error: "Missing opportunityId." };

    log('Récupération des données...');
    const res = await utils.sfRequest(opts, `/sobjects/Opportunity/${encodeURIComponent(opportunityId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Amount: r.Amount, StageName: r.StageName, CloseDate: r.CloseDate, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
