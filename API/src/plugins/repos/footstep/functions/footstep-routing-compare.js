const { utils } = require("./utils");

module.exports = {
  async footstep_routing_compare(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let locations;
    let travel_modes;
    let travel_options;
    try {
      locations = utils.parseJsonInput(d.locations, "points de passage", []);
      travel_modes = utils.parseJsonInput(d.travel_modes, "modes de déplacement", ["auto", "pedestrian"]);
      travel_options = utils.parseJsonInput(d.travel_options, "options de déplacement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(locations) || locations.length < 2) return { ok: false, error: "Au moins deux points sont requis." };
    if (!Array.isArray(travel_modes) || travel_modes.length < 2) return { ok: false, error: "Au moins deux modes sont requis." };

    const body = utils.withOptionalBodyFields({ locations, travel_modes }, d, ["format"]);
    if (travel_options) body.travel_options = travel_options;
    if (utils.toNumber(d.elevation_interval) !== undefined) body.elevation_interval = utils.toNumber(d.elevation_interval);

    log("Comparaison des itinéraires...");
    const res = await utils.footstepRequest(opts, "/v1/routing/compare", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, routes: res.data?.routes || res.data?.comparisons || [], summary: res.data?.summary || null, raw: res.data };
  }
};
