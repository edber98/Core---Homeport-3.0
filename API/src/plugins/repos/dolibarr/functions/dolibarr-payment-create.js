const { utils } = require("./utils");

module.exports = {
  async dolibarr_payment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };
    if (!d.datepaye && d.datepaye !== 0) return { ok: false, error: "Champ datepaye requis." };
    if (!d.amount && d.amount !== 0) return { ok: false, error: "Champ amount requis." };

    const body = {};
    if (d.datepaye !== undefined && d.datepaye !== null && d.datepaye !== "") body.datepaye = d.datepaye;
    if (d.amount !== undefined && d.amount !== null && d.amount !== "") body.amount = d.amount;
    if (d.paymentid !== undefined && d.paymentid !== null && d.paymentid !== "") body.paymentid = d.paymentid;
    if (d.num_payment !== undefined && d.num_payment !== null && d.num_payment !== "") body.num_payment = d.num_payment;
    if (d.closepaidinvoices !== undefined && d.closepaidinvoices !== null && d.closepaidinvoices !== "") body.closepaidinvoices = d.closepaidinvoices;
    if (d.accountid !== undefined && d.accountid !== null && d.accountid !== "") body.accountid = d.accountid;
    if (d.comment !== undefined && d.comment !== null && d.comment !== "") body.comment = d.comment;

    const res = await utils.dolibarrRequest(opts, `/invoices/${encodeURIComponent(d.id)}/payments`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
