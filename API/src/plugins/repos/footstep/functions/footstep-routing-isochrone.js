const { utils } = require("./utils");

module.exports = {
  async footstep_routing_isochrone(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let locations;
    let contours;
    let travel_options;
    try {
      locations = utils.parseJsonInput(d.locations, "origine", undefined);
      contours = utils.parseJsonInput(d.contours, "contours", []);
      travel_options = utils.parseJsonInput(d.travel_options, "options de déplacement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(contours) || !contours.length) return { ok: false, error: "Au moins un contour est requis." };

    const body = utils.withOptionalBodyFields({ contours }, d, ["travel", "format", "from"]);
    if (locations) body.locations = locations;
    if (travel_options) body.travel_options = travel_options;
    if (utils.boolValue(d.polygons) !== undefined) body.polygons = utils.boolValue(d.polygons);
    if (utils.boolValue(d.show_locations) !== undefined) body.show_locations = utils.boolValue(d.show_locations);
    if (utils.toNumber(d.denoise) !== undefined) body.denoise = utils.toNumber(d.denoise);

    log("Calcul de la zone atteignable...");
    const res = await utils.footstepRequest(opts, "/v1/routing/isochrone", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, contours: res.data?.contours || res.data?.features || [], geojson: res.data?.type === "FeatureCollection" ? res.data : null, raw: res.data };
  }
};
