const { utils } = require("./utils");

module.exports = {
  async bill_payment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.vendorId) return { ok: false, error: "ID du fournisseur requis." };
    let billPayments;
    try { billPayments = utils.parseJson(d.billPaymentsJson, undefined, "Paiements de factures"); } catch (e) { return { ok: false, error: e.message }; }
    const body = { vendorId: d.vendorId };
    if (d.billId) body.billId = d.billId;
    if (d.amount !== undefined && d.amount !== "") body.amount = Number(d.amount);
    if (d.processDate) body.processDate = d.processDate;
    if (d.fundingBankAccountId) body.fundingBankAccountId = d.fundingBankAccountId;
    if (d.createBill !== undefined) body.createBill = !!d.createBill;
    if (Array.isArray(billPayments)) body.billPayments = billPayments;
    const res = await utils.billRequest(opts, "POST", "/v3/payments", { body });
    if (!res.ok) return res;
    const payment = res.data || {};
    return { ok: true, id: payment.id || "", vendorId: payment.vendorId || d.vendorId, billId: payment.billId || d.billId || "", amount: payment.amount || Number(d.amount || 0), status: payment.status || "" };
  }
};
