const { utils } = require("./utils");

module.exports = {
  async sap_material_update(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.material) return { ok: false, error: "Missing material." };
  
      const body = {};
      if (d.ProductType) body.ProductType = d.ProductType;
      if (d.BaseUnit) body.BaseUnit = d.BaseUnit;
  
      log('Mise à jour en cours...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${d.material}')`,
        { method: "PATCH", body }
      );
      if (!res.ok) return res;
      return { ok: true, status: "updated", message: `Material ${d.material} updated.` };
    }
};
