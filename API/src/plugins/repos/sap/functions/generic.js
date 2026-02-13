const { utils } = require("./utils");

module.exports = {
  /**
   * Generic OData GET request
   */
  async sap_odata_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Missing path." };

    log('Récupération des données...');
    const res = await utils.sapRequest(opts, d.path);
    if (!res.ok) return res;
    return { ok: true, data: typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data || "") };
  },

  /**
   * Generic OData POST request
   */
  async sap_odata_post(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Missing path." };

    let body = null;
    if (d.body) {
      if (typeof d.body === "string") {
        try {
          body = JSON.parse(d.body);
        } catch (e) {
          return { ok: false, error: "Invalid JSON in body: " + e.message };
        }
      } else {
        body = d.body;
      }
    }

    log('Appel API en cours...');
    const res = await utils.sapRequest(opts, d.path, { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, data: typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data || "") };
  },
};
