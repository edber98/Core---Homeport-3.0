const { utils } = require("./utils");

module.exports = {
  async postman_monitor_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = String(d.name || "").trim();
    const collectionUid = String(d.collectionUid || "").trim();
    if (!name) return { ok: false, error: "Nom du monitor requis." };
    if (!collectionUid) return { ok: false, error: "collectionUid requis." };

    const monitor = {
      name,
      collectionUid,
      schedule: d.schedule && typeof d.schedule === 'object' ? d.schedule : { cron: '0 0 * * *', timezone: 'UTC' }
    };

    const res = await utils.postmanRequest(opts, "/monitors", { method: "POST", body: { monitor } });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "monitor");
  }
};
