const { utils } = require("./utils");

module.exports = {
  async footstep_routing_matrix(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let sources;
    let targets;
    let travel_options;
    try {
      sources = utils.parseJsonInput(d.sources, "sources", []);
      targets = utils.parseJsonInput(d.targets, "destinations", []);
      travel_options = utils.parseJsonInput(d.travel_options, "options de déplacement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(sources) || !sources.length) return { ok: false, error: "Au moins une source est requise." };
    if (!Array.isArray(targets) || !targets.length) return { ok: false, error: "Au moins une destination est requise." };

    const body = utils.withOptionalBodyFields({ sources, targets }, d, ["travel", "units", "format"]);
    if (travel_options) body.travel_options = travel_options;

    log("Calcul de la matrice...");
    const res = await utils.footstepRequest(opts, "/v1/routing/matrix", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, matrix: res.data?.matrix || res.data?.durations || [], sources: res.data?.sources || sources, targets: res.data?.targets || targets, raw: res.data };
  }
};
