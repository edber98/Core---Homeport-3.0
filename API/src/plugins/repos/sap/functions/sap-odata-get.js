const { utils } = require("./utils");

module.exports = {
  async sap_odata_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.path) return { ok: false, error: "Missing path." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(opts, d.path);
      if (!res.ok) return res;
      return { ok: true, data: typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data || "") };
    }
};
