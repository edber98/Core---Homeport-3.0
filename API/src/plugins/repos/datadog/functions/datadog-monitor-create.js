const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Nom du monitor requis." };
    if (!d.type) return { ok: false, error: "Type du monitor requis." };
    if (!d.query) return { ok: false, error: "Requête du monitor requise." };

    let options;
    try {
      options = utils.parseJson(d.options, "options", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.compact({
      name: d.name,
      type: d.type,
      query: d.query,
      message: d.message,
      tags: utils.splitCsv(d.tags),
      priority: utils.toNumber(d.priority),
      options
    });

    log("Création du monitor...");
    const res = await utils.datadogRequest(opts, "/api/v1/monitor", { method: "POST", body });
    if (!res.ok) return res;
    return utils.monitorResult(res.data || {});
  }
};
