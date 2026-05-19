const { utils } = require("./utils");

module.exports = {
  async footstep_geocoding_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const text = String(d.text || "").trim();
    if (!text) return { ok: false, error: "Texte de recherche requis." };

    log("Recherche de coordonnées...");
    const res = await utils.footstepRequest(opts, "/v1/geocoding/search", {
      query: utils.compactObject({
        text,
        size: utils.toNumber(d.size),
        "focus.point.lat": utils.toNumber(d.focusLat),
        "focus.point.lon": utils.toNumber(d.focusLon),
        "boundary.country": d.country,
        place_types: d.placeTypes
      })
    });
    if (!res.ok) return res;
    return utils.geocodingResult(res.data || {});
  }
};
