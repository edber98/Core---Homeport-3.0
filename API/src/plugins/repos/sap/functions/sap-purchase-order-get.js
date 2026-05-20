const { utils } = require("./utils");

module.exports = {
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
    }
};
