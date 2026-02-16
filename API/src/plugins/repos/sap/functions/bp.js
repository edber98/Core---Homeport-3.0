const { utils } = require("./utils");

module.exports = {
  /**
   * Create a Business Partner
   */
  async sap_bp_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.BusinessPartnerFullName)
      return { ok: false, error: "Missing BusinessPartnerFullName." };

    const body = { BusinessPartnerFullName: d.BusinessPartnerFullName };
    if (d.BusinessPartnerCategory) body.BusinessPartnerCategory = d.BusinessPartnerCategory;
    if (d.FirstName) body.FirstName = d.FirstName;
    if (d.LastName) body.LastName = d.LastName;
    if (d.OrganizationBPName1) body.OrganizationBPName1 = d.OrganizationBPName1;

    log('Création en cours...');
    const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner", {
      method: "POST",
      body,
    });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Get a Business Partner by key
   */
  async sap_bp_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.businessPartner)
      return { ok: false, error: "Missing businessPartner." };

    log('Récupération des données...');
    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${d.businessPartner}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * Update a Business Partner
   */
  async sap_bp_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.businessPartner)
      return { ok: false, error: "Missing businessPartner." };

    const body = {};
    if (d.BusinessPartnerFullName) body.BusinessPartnerFullName = d.BusinessPartnerFullName;
    if (d.SearchTerm1) body.SearchTerm1 = d.SearchTerm1;

    log('Mise à jour en cours...');
    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${d.businessPartner}')`,
      { method: "PATCH", body }
    );
    if (!res.ok) return res;
    return { ok: true, status: "updated", message: `Business Partner ${d.businessPartner} updated.` };
  },

  /**
   * Delete a Business Partner
   */
  async sap_bp_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.businessPartner)
      return { ok: false, error: "Missing businessPartner." };

    log('Suppression en cours...');
    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${d.businessPartner}')`,
      { method: "DELETE" }
    );
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: `Business Partner ${d.businessPartner} deleted.` };
  },

  /**
   * List Business Partners
   */
  async sap_bp_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    log('Récupération de la liste...');
    const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner", { query });
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
