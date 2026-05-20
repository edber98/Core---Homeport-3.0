const { utils } = require("./utils");

module.exports = {
  async sap_cost_center_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.controllingArea) return { ok: false, error: "Missing controllingArea." };
      if (!d.costCenter) return { ok: false, error: "Missing costCenter." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_COSTCENTER_SRV/A_CostCenter(ControllingArea='${d.controllingArea}',CostCenter='${d.costCenter}')`
      );
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
