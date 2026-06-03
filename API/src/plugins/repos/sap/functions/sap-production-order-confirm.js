const { utils } = require("./utils");

module.exports = {
  async sap_production_order_confirm(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.manufacturingOrder)
        return { ok: false, error: "Missing manufacturingOrder." };
  
      const body = {
        ManufacturingOrder: d.manufacturingOrder,
      };
      if (d.orderOperation) body.OrderOperation = d.orderOperation;
      if (d.yieldQuantity) body.YieldQuantity = d.yieldQuantity;
      if (d.unitOfMeasure) body.UnitOfMeasure = d.unitOfMeasure;
  
      log('Appel API en cours...');
      const res = await utils.sapRequest(
        opts,
        "/sap/opu/odata/sap/API_PROD_ORDER_CONFIRMATION_2_SRV/ProdnOrdConfMatlDocItm",
        { method: "POST", body }
      );
      if (!res.ok) return res;
      return {
        ok: true,
        status: "confirmed",
        message: `Production Order ${d.manufacturingOrder} confirmed.`,
      };
    }
};
