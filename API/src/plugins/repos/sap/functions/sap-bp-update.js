const { utils } = require("./utils");

module.exports = {
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
    }
};
