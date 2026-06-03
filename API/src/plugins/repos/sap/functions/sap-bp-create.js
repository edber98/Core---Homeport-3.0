const { utils } = require("./utils");

module.exports = {
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
    }
};
