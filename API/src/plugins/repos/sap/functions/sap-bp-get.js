const { utils } = require("./utils");

module.exports = {
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
    }
};
