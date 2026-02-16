const { utils } = require("./utils");

module.exports = {
  /**
   * Create a Purchase Order
   */
  async sap_purchase_order_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.CompanyCode) return { ok: false, error: "Missing CompanyCode." };
    if (!d.Supplier) return { ok: false, error: "Missing Supplier." };

    const body = {
      CompanyCode: d.CompanyCode,
      Supplier: d.Supplier,
    };
    if (d.PurchaseOrderType) body.PurchaseOrderType = d.PurchaseOrderType;
    if (d.PurchasingOrganization) body.PurchasingOrganization = d.PurchasingOrganization;
    if (d.PurchasingGroup) body.PurchasingGroup = d.PurchasingGroup;

    log('Création en cours...');
    const res = await utils.sapRequest(
      opts,
      "/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder",
      { method: "POST", body }
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Get a Purchase Order by key
   */
  async sap_purchase_order_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.purchaseOrder) return { ok: false, error: "Missing purchaseOrder." };

    log('Récupération des données...');
    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder('${d.purchaseOrder}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Update a Purchase Order
   */
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
  },

  /**
   * List Purchase Orders
   */
  async sap_purchase_orders_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    log('Récupération de la liste...');
    const res = await utils.sapRequest(
      opts,
      "/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder",
      { query }
    );
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
