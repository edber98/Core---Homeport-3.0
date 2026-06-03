const { utils } = require("./utils");

module.exports = {
  async datadog_metric_submit(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let series;
    try {
      series = utils.parseJson(d.series, "séries", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(series) || !series.length) return { ok: false, error: "Au moins une série métrique est requise." };
    log("Envoi des métriques...");
    const res = await utils.datadogRequest(opts, "/api/v2/series", { method: "POST", body: { series }, requireAppKey: false });
    if (!res.ok) return res;
    return { ok: true, accepted: true, raw: res.data };
  }
};
