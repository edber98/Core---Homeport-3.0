const { utils } = require("./utils");

module.exports = {
  async footstep_routing_optimize(node, msg, inputs, opts) {
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
    if (!Array.isArray(locations) || locations.length < 4) return { ok: false, error: "Au moins quatre points sont requis." };

    const body = utils.withOptionalBodyFields({ locations }, d, ["travel", "units", "format"]);
    if (travel_options) body.travel_options = travel_options;
    if (utils.toNumber(d.elevation_interval) !== undefined) body.elevation_interval = utils.toNumber(d.elevation_interval);
    if (utils.boolValue(d.narrative) !== undefined) body.narrative = utils.boolValue(d.narrative);

    log("Optimisation des arrêts...");
    const res = await utils.footstepRequest(opts, "/v1/routing/optimize", { method: "POST", body });
    if (!res.ok) return res;
    const out = utils.routeResult(res.data || {});
    out.optimized_order = res.data?.optimized_order || res.data?.order || null;
    out.savings = res.data?.savings || null;
    return out;
  }
};
