const { utils } = require("./utils");

module.exports = {
  /**
   * Get a Billing Document by key
   */
  async sap_billing_doc_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.billingDocument) return { ok: false, error: "Missing billingDocument." };

    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${d.billingDocument}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * List Billing Documents
   */
  async sap_billing_docs_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    const res = await utils.sapRequest(
      opts,
      "/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument",
      { query }
    );
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },

  /**
   * List Billing Document Items
   */
  async sap_billing_doc_items_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.billingDocument) return { ok: false, error: "Missing billingDocument." };

    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;

    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${d.billingDocument}')/to_Item`,
      { query }
    );
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
