const { utils } = require("./utils");

module.exports = {
  async salesforce_contact_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const LastName = (d.LastName || "").trim();
    if (!LastName) return { ok: false, error: "Missing LastName." };

    const body = { LastName };
    if (d.FirstName) body.FirstName = d.FirstName;
    if (d.Email) body.Email = d.Email;
    if (d.Phone) body.Phone = d.Phone;
    if (d.AccountId) body.AccountId = d.AccountId;

    const res = await utils.sfRequest(opts, "/sobjects/Contact", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Contact/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, AccountId: r.AccountId, CreatedDate: r.CreatedDate };
  }
};
