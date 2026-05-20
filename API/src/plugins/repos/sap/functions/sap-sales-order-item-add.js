const { utils } = require("./utils");

module.exports = {
  async sap_sales_order_item_add(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.SalesOrder) return { ok: false, error: "Missing SalesOrder." };
      if (!d.Material) return { ok: false, error: "Missing Material." };
  
      const body = {
        SalesOrder: d.SalesOrder,
        Material: d.Material,
      };
      if (d.RequestedQuantity) body.RequestedQuantity = d.RequestedQuantity;
      if (d.SalesOrderItemCategory) body.SalesOrderItemCategory = d.SalesOrderItemCategory;
  
      log('Création en cours...');
      const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem", {
        method: "POST",
        body,
      });
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
