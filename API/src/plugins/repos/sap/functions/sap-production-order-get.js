const { utils } = require("./utils");

module.exports = {
  async sap_production_order_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.manufacturingOrder)
        return { ok: false, error: "Missing manufacturingOrder." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder_2('${d.manufacturingOrder}')`
      );
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
