const { utils } = require("./utils");

module.exports = {
  async qb_bill_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const billId = (d.billId || "").toString().trim();
    if (!billId) return { ok: false, error: "Missing billId." };

    const getRes = await utils.qbRequest(opts, `/bill/${encodeURIComponent(billId)}`);
    if (!getRes.ok) return { ok: false, error: getRes.error, status: getRes.status, details: getRes.details };

    const existing = (getRes.data && getRes.data.Bill) || getRes.data || {};
    const body = { Id: billId, SyncToken: existing.SyncToken, sparse: true };
    if (d.vendorRef) body.VendorRef = { value: String(d.vendorRef) };
    if (d.txnDate) body.TxnDate = d.txnDate;
    if (d.dueDate) body.DueDate = d.dueDate;
    if (d.lineItems) {
      try { body.Line = JSON.parse(d.lineItems); } catch { return { ok: false, error: "Invalid lineItems JSON." }; }
    }

    const res = await utils.qbRequest(opts, "/bill", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Bill) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", dueDate: r.DueDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : ""), vendorRef: (r.VendorRef && String(r.VendorRef.value)) || "" };
  }
};
