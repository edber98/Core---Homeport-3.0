const { utils } = require("./utils");

module.exports = {
  async atera_contact_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.Email) return { ok: false, error: "Missing Email." };

    const body = { Email: d.Email };
    if (d.CustomerID) body.CustomerID = Number(d.CustomerID);
    if (d.CustomerName) body.CustomerName = d.CustomerName;
    if (d.Firstname) body.Firstname = d.Firstname;
    if (d.Lastname) body.Lastname = d.Lastname;
    if (d.JobTitle) body.JobTitle = d.JobTitle;
    if (d.Phone) body.Phone = d.Phone;

    const res = await utils.ateraRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
