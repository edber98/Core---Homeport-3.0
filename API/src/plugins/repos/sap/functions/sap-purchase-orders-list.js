const { utils } = require("./utils");

module.exports = {
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
    }
};
