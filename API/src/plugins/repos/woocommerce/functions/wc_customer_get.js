const { utils } = require("./utils");

module.exports = {
  async wc_customer_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    log('Récupération des données...');
    const res = await utils.wcRequest(opts, `/customers/${d.customerId}`);
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", username: c.username || "", date_created: c.date_created || "" };
  }
};
