const { utils } = require("./utils");

module.exports = {
  async sap_material_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.material) return { ok: false, error: "Missing material." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${d.material}')`
      );
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
