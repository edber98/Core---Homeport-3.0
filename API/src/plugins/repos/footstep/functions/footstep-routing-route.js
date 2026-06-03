const { utils } = require("./utils");

module.exports = {
  async footstep_routing_route(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let locations;
    let travel_options;
    try {
      locations = utils.parseJsonInput(d.locations, "points de passage", []);
      travel_options = utils.parseJsonInput(d.travel_options, "options de déplacement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(locations) || locations.length < 2) return { ok: false, error: "Au moins deux points sont requis." };

    const body = utils.withOptionalBodyFields({ locations }, d, ["travel", "units", "language", "format"]);
    if (travel_options) body.travel_options = travel_options;
    if (utils.toNumber(d.elevation_interval) !== undefined) body.elevation_interval = utils.toNumber(d.elevation_interval);
    if (utils.toNumber(d.alternates) !== undefined) body.alternates = utils.toNumber(d.alternates);
    if (utils.boolValue(d.narrative) !== undefined) body.narrative = utils.boolValue(d.narrative);

    log("Calcul de l'itinéraire...");
    const res = await utils.footstepRequest(opts, "/v1/routing/route", { method: "POST", body });
    if (!res.ok) return res;
    return utils.routeResult(res.data || {});
  }
};
