const { utils } = require("./utils");

module.exports = {
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
    }
};
