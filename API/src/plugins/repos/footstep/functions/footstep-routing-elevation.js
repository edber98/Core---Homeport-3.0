const { utils } = require("./utils");

module.exports = {
  async footstep_routing_elevation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let shape;
    try {
      shape = utils.parseJsonInput(d.shape, "points", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.withOptionalBodyFields({}, d, ["encoded_polyline", "format"]);
    if (shape) body.shape = shape;
    if (!body.shape && !body.encoded_polyline) return { ok: false, error: "Des points ou une polyline encodée sont requis." };
    if (utils.boolValue(d.range) !== undefined) body.range = utils.boolValue(d.range);
    if (utils.toNumber(d.resample_distance) !== undefined) body.resample_distance = utils.toNumber(d.resample_distance);
    if (utils.toNumber(d.height_precision) !== undefined) body.height_precision = utils.toNumber(d.height_precision);

    log("Récupération des altitudes...");
    const res = await utils.footstepRequest(opts, "/v1/routing/elevation", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, elevations: res.data?.elevations || res.data?.height || res.data?.shape || [], summary: res.data?.summary || null, raw: res.data };
  }
};
