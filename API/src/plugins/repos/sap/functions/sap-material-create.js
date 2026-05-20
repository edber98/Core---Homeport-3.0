const { utils } = require("./utils");

module.exports = {
  async sap_material_create(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.Product) return { ok: false, error: "Missing Product." };
      if (!d.ProductType) return { ok: false, error: "Missing ProductType." };
  
      const body = {
        Product: d.Product,
        ProductType: d.ProductType,
      };
      if (d.IndustrySector) body.IndustrySector = d.IndustrySector;
      if (d.BaseUnit) body.BaseUnit = d.BaseUnit;
  
      log('Création en cours...');
      const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product", {
        method: "POST",
        body,
      });
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
