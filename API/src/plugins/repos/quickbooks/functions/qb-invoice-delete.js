const { utils } = require("./utils");

module.exports = {
  async qb_invoice_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    const syncToken = (d.syncToken || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };
    if (!syncToken) return { ok: false, error: "Missing syncToken." };

    log('Suppression en cours...');
    const res = await utils.qbRequest(opts, "/invoice", { method: "POST", query: { operation: "delete" }, body: { Id: invoiceId, SyncToken: syncToken } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Facture ${invoiceId} supprimée.` };
  }
};
