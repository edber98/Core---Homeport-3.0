const { utils } = require("./utils");

module.exports = {
  async footstep_routing_find_and_route(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const destination = String(d.destination || "").trim();
    if (!destination) return { ok: false, error: "Destination requise." };

    let origin;
    let travel_options;
    try {
      origin = utils.parseJsonInput(d.origin, "origine", d.origin);
      travel_options = utils.parseJsonInput(d.travel_options, "options de déplacement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!origin) return { ok: false, error: "Origine requise." };

    const body = utils.withOptionalBodyFields({ origin, destination }, d, ["destination_country", "origin_country", "travel", "format"]);
    if (travel_options) body.travel_options = travel_options;
    if (utils.toNumber(d.elevation_interval) !== undefined) body.elevation_interval = utils.toNumber(d.elevation_interval);
    if (utils.boolValue(d.narrative) !== undefined) body.narrative = utils.boolValue(d.narrative);

    log("Recherche et calcul de l'itinéraire...");
    const res = await utils.footstepRequest(opts, "/v1/routing/find-and-route", { method: "POST", body });
    if (!res.ok) return res;
    const out = utils.routeResult(res.data || {});
    out.destination = res.data?.destination || res.data?.matched_destination || null;
    out.alternatives = res.data?.alternatives || res.data?.matches || [];
    return out;
  }
};
