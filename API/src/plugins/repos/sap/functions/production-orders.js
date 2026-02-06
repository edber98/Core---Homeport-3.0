const { utils } = require("./utils");

module.exports = {
  /**
   * Get a Production Order by key
   */
  async sap_production_order_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.manufacturingOrder)
      return { ok: false, error: "Missing manufacturingOrder." };

    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${d.manufacturingOrder}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Confirm a Production Order (create confirmation)
   */
  async sap_production_order_confirm(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.manufacturingOrder)
      return { ok: false, error: "Missing manufacturingOrder." };

    const body = {
      ManufacturingOrder: d.manufacturingOrder,
    };
    if (d.orderOperation) body.OrderOperation = d.orderOperation;
    if (d.yieldQuantity) body.YieldQuantity = d.yieldQuantity;
    if (d.unitOfMeasure) body.UnitOfMeasure = d.unitOfMeasure;

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
  },

  /**
   * List Production Orders
   */
  async sap_production_orders_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    const res = await utils.sapRequest(
      opts,
      "/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2",
      { query }
    );
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
