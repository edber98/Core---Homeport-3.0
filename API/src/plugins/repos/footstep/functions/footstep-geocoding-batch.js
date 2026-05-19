const { utils } = require("./utils");

module.exports = {
  async footstep_geocoding_batch(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let items;
    try {
      items = utils.parseJsonInput(d.items, "adresses", []);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(items) || !items.length) return { ok: false, error: "Au moins une adresse est requise." };

    log("Géocodage groupé...");
    const res = await utils.footstepRequest(opts, "/v1/geocoding/batch", {
      method: "POST",
      body: utils.compactObject({ items, size: utils.toNumber(d.size) })
    });
    if (!res.ok) return res;
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    return { ok: true, totalCount: results.length, results, raw: res.data };
  }
};
