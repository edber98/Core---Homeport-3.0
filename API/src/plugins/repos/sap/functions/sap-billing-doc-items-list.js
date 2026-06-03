const { utils } = require("./utils");

module.exports = {
  async sap_billing_doc_items_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.billingDocument) return { ok: false, error: "Missing billingDocument." };
  
      const query = {};
      if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
      if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
  
      log('Récupération de la liste...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${d.billingDocument}')/to_Item`,
        { query }
      );
      if (!res.ok) return res;
      const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
      return { ok: true, results };
    }
};
