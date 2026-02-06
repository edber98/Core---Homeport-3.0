const { utils } = require("./utils");

module.exports = {
  async salesforce_lead_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const LastName = (d.LastName || "").trim();
    if (!LastName) return { ok: false, error: "Missing LastName." };
    const Company = (d.Company || "").trim();
    if (!Company) return { ok: false, error: "Missing Company." };

    const body = { LastName, Company };
    if (d.FirstName) body.FirstName = d.FirstName;
    if (d.Email) body.Email = d.Email;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Status) body.Status = d.Status;

    const res = await utils.sfRequest(opts, "/sobjects/Lead", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const getRes = await utils.sfRequest(opts, `/sobjects/Lead/${res.data.id}`);
    if (!getRes.ok) return { ok: true, id: res.data.id };
    const r = getRes.data || {};
    return { ok: true, id: r.Id, FirstName: r.FirstName, LastName: r.LastName, Email: r.Email, Phone: r.Phone, Company: r.Company, Status: r.Status, CreatedDate: r.CreatedDate };
  }
};
