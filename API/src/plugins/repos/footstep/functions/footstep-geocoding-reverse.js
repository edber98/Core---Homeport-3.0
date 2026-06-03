const { utils } = require("./utils");

module.exports = {
  async footstep_geocoding_reverse(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const lat = utils.toNumber(d.lat);
    const lon = utils.toNumber(d.lon);
    if (lat === undefined || lon === undefined) return { ok: false, error: "Latitude et longitude requises." };

    log("Recherche de l'adresse...");
    const res = await utils.footstepRequest(opts, "/v1/geocoding/reverse", {
      query: utils.compactObject({
        "point.lat": lat,
        "point.lon": lon,
        size: utils.toNumber(d.size),
        "boundary.circle.radius": utils.toNumber(d.radius),
        place_types: d.placeTypes
      })
    });
    if (!res.ok) return res;
    return utils.geocodingResult(res.data || {});
  }
};
