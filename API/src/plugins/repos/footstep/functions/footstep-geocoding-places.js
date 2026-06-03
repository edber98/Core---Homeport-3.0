const { utils } = require("./utils");

module.exports = {
  async footstep_geocoding_places(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = String(d.query || "").trim();
    if (!query) return { ok: false, error: "Recherche de lieu requise." };

    log("Recherche de lieux...");
    const res = await utils.footstepRequest(opts, "/v1/geocoding/places", {
      query: utils.compactObject({
        query,
        near: d.near,
        "near.lat": utils.toNumber(d.nearLat),
        "near.lon": utils.toNumber(d.nearLon),
        radius: utils.toNumber(d.radius),
        size: utils.toNumber(d.size),
        "boundary.country": d.country
      })
    });
    if (!res.ok) return res;
    return utils.geocodingResult(res.data || {});
  }
};
