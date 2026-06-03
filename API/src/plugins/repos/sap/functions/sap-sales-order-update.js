const { utils } = require("./utils");

module.exports = {
  async sap_sales_order_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.salesOrder) return { ok: false, error: "Missing salesOrder." };
  
      const body = {};
      if (d.PurchaseOrderByCustomer) body.PurchaseOrderByCustomer = d.PurchaseOrderByCustomer;
  
      log('Mise à jour en cours...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('${d.salesOrder}')`,
        { method: "PATCH", body }
      );
      if (!res.ok) return res;
      return { ok: true, status: "updated", message: `Sales Order ${d.salesOrder} updated.` };
    }
};
