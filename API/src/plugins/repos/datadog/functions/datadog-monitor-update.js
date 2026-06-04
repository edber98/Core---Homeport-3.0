const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const monitorId = String(d.monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };

    let options;
    try {
      options = utils.parseJson(d.monitorOptions, "options", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.compact({
      name: d.name,
      type: d.type,
      query: d.monitorQuery,
      message: d.message,
      tags: utils.splitCsv(d.tags),
      priority: utils.toNumber(d.priority),
      options
    });

    log("Mise à jour du monitor...");
    const res = await utils.datadogRequest(opts, `/api/v1/monitor/${encodeURIComponent(monitorId)}`, { method: "PUT", body });
    if (!res.ok) return res;
    return utils.monitorResult(res.data || {});
  }
};
