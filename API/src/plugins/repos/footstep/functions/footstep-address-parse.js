const { utils } = require("./utils");

module.exports = {
  async footstep_address_parse(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let addresses;
    try {
      addresses = utils.parseJsonInput(d.addresses, "adresses", []);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(addresses) || !addresses.length) return { ok: false, error: "Au moins une adresse est requise." };

    log("Analyse des adresses...");
    const res = await utils.footstepRequest(opts, "/v1/ai/parse-address", {
      method: "POST",
      body: { addresses }
    });
    if (!res.ok) return res;
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    return { ok: true, totalCount: results.length, results, raw: res.data };
  }
};
