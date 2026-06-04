const { utils } = require("./utils");

module.exports = {
  async sap_odata_post(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.path) return { ok: false, error: "Missing path." };
  
      let body = null;
      if (d.entityData) {
        if (typeof d.entityData === "string") {
          try {
            body = JSON.parse(d.entityData);
          } catch (e) {
            return { ok: false, error: "Invalid JSON in entityData: " + e.message };
          }
        } else {
          body = d.entityData;
        }
      }
  
      log('Appel API en cours...');
      const res = await utils.sapRequest(opts, d.path, { method: "POST", body });
      if (!res.ok) return res;
      return { ok: true, data: typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data || "") };
    }
};
