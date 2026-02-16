const { utils } = require("./utils");

module.exports = {
  async salesforce_opportunity_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const opportunityId = (d.opportunityId || "").toString().trim();
    if (!opportunityId) return { ok: false, error: "Missing opportunityId." };

    const body = {};
    if (d.Name) body.Name = d.Name;
    if (d.Amount) body.Amount = parseFloat(d.Amount);
    if (d.StageName) body.StageName = d.StageName;
    if (d.CloseDate) body.CloseDate = d.CloseDate;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.sfRequest(opts, `/sobjects/Opportunity/${encodeURIComponent(opportunityId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Opportunity/${encodeURIComponent(opportunityId)}`);
    if (!getRes.ok) return { ok: true, id: opportunityId, status: "updated" };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Amount: r.Amount, StageName: r.StageName, CloseDate: r.CloseDate, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
