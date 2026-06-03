const { utils } = require("./utils");

module.exports = {
  async postman_monitor_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const monitorId = String(d.monitorId || "").trim();
    if (!monitorId) return { ok: false, error: "ID du monitor requis." };

    const monitor = utils.compact({
      name: d.name,
      collectionUid: d.collectionUid,
      schedule: d.schedule && typeof d.schedule === 'object' ? d.schedule : undefined
    });
    if (!Object.keys(monitor).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    const res = await utils.postmanRequest(opts, `/monitors/${encodeURIComponent(monitorId)}`, { method: "PUT", body: { monitor } });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "monitor");
  }
};
