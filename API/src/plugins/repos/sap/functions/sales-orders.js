const { utils } = require("./utils");

module.exports = {
  /**
   * Create a Sales Order
   */
  async sap_sales_order_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.SalesOrderType) return { ok: false, error: "Missing SalesOrderType." };
    if (!d.SoldToParty) return { ok: false, error: "Missing SoldToParty." };

    const body = {
      SalesOrderType: d.SalesOrderType,
      SoldToParty: d.SoldToParty,
    };
    if (d.PurchaseOrderByCustomer) body.PurchaseOrderByCustomer = d.PurchaseOrderByCustomer;
    if (d.SalesOrganization) body.SalesOrganization = d.SalesOrganization;
    if (d.DistributionChannel) body.DistributionChannel = d.DistributionChannel;
    if (d.OrganizationDivision) body.OrganizationDivision = d.OrganizationDivision;

    log('Création en cours...');
    const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder", {
      method: "POST",
      body,
    });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Get a Sales Order by key
   */
  async sap_sales_order_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.salesOrder) return { ok: false, error: "Missing salesOrder." };

    log('Récupération des données...');
    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('${d.salesOrder}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Update a Sales Order
   */
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
  },

  /**
   * Add a Sales Order Item
   */
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
  },

  /**
   * List Sales Orders
   */
  async sap_sales_orders_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    log('Récupération de la liste...');
    const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder", { query });
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
