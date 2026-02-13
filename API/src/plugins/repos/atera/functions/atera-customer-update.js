const { utils } = require("./utils");

module.exports = {
  async atera_customer_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };

    const body = {};
    if (d.CustomerName) body.CustomerName = d.CustomerName;
    if (d.Domain) body.Domain = d.Domain;
    if (d.Address) body.Address = d.Address;
    if (d.City) body.City = d.City;
    if (d.State) body.State = d.State;
    if (d.Country) body.Country = d.Country;
    if (d.Phone) body.Phone = d.Phone;
    if (d.Notes) body.Notes = d.Notes;

    log('Mise à jour en cours...');
    const res = await utils.ateraRequest(opts, `/customers/${encodeURIComponent(d.customerId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ActionID: res.data?.ActionID };
  }
};
