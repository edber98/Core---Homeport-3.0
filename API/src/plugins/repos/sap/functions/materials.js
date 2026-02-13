const { utils } = require("./utils");

module.exports = {
  /**
   * Create a Material (Product)
   */
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
  },

  /**
   * Get a Material by key
   */
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
  },

  /**
   * Update a Material
   */
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
  },

  /**
   * List Materials
   */
  async sap_materials_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;

    log('Récupération de la liste...');
    const res = await utils.sapRequest(opts, "/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product", { query });
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
