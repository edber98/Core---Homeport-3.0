const { utils } = require("./utils");

module.exports = {
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
    }
};
