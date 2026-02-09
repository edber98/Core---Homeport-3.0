const { utils } = require("./utils");

module.exports = {
  async dolibarr_invoice_validate(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };

    const body = {};
    if (d.idwarehouse !== undefined && d.idwarehouse !== null && d.idwarehouse !== "") body.idwarehouse = d.idwarehouse;
    if (d.notrigger !== undefined && d.notrigger !== null && d.notrigger !== "") body.notrigger = d.notrigger;

    const res = await utils.dolibarrRequest(opts, `/invoices/${encodeURIComponent(d.id)}/validate`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
