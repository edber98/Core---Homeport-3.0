const { utils } = require("./utils");

module.exports = {
  async salesforce_opportunity_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const Name = (d.Name || "").trim();
    if (!Name) return { ok: false, error: "Missing Name." };
    const StageName = (d.StageName || "").trim();
    if (!StageName) return { ok: false, error: "Missing StageName." };
    const CloseDate = (d.CloseDate || "").trim();
    if (!CloseDate) return { ok: false, error: "Missing CloseDate." };

    const body = { Name, StageName, CloseDate };
    if (d.Amount) body.Amount = parseFloat(d.Amount);
    if (d.AccountId) body.AccountId = d.AccountId;

    log('Création en cours...');
    const res = await utils.sfRequest(opts, "/sobjects/Opportunity", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Opportunity/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, Name: r.Name, Amount: r.Amount, StageName: r.StageName, CloseDate: r.CloseDate, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
