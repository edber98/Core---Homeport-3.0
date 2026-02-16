const { utils } = require("./utils");

module.exports = {
  async qb_bill_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const billId = (d.billId || "").toString().trim();
    if (!billId) return { ok: false, error: "Missing billId." };

    log('Récupération des données...');
    const res = await utils.qbRequest(opts, `/bill/${encodeURIComponent(billId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Bill) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", dueDate: r.DueDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : ""), vendorRef: (r.VendorRef && String(r.VendorRef.value)) || "" };
  }
};
