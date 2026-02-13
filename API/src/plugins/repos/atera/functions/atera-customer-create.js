const { utils } = require("./utils");

module.exports = {
  async atera_customer_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.CustomerName) return { ok: false, error: "Missing CustomerName." };

    const body = { CustomerName: d.CustomerName };
    if (d.Domain) body.Domain = d.Domain;
    if (d.Address) body.Address = d.Address;
    if (d.City) body.City = d.City;
    if (d.State) body.State = d.State;
    if (d.Country) body.Country = d.Country;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Notes) body.Notes = d.Notes;

    log('Création en cours...');
    const res = await utils.ateraRequest(opts, "/customers", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
