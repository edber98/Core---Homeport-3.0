const { utils } = require("./utils");

module.exports = {
  async sap_billing_doc_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.billingDocument) return { ok: false, error: "Missing billingDocument." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${d.billingDocument}')`
      );
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
