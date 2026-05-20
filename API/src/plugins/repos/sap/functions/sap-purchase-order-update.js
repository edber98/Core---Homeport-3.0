const { utils } = require("./utils");

module.exports = {
  async sap_purchase_order_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.purchaseOrder) return { ok: false, error: "Missing purchaseOrder." };
  
      const body = {};
      if (d.Supplier) body.Supplier = d.Supplier;
  
      log('Mise à jour en cours...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('${d.purchaseOrder}')`,
        { method: "PATCH", body }
      );
      if (!res.ok) return res;
      return { ok: true, status: "updated", message: `Purchase Order ${d.purchaseOrder} updated.` };
    }
};
