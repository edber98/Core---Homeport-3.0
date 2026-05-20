const { utils } = require("./utils");

module.exports = {
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
    }
};
