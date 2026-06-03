const { utils } = require("./utils");

module.exports = {
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
    }
};
