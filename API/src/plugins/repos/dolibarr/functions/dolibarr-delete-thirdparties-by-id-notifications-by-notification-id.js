const { utils } = require("./utils");

module.exports = {
  async dolibarr_delete_thirdparties_by_id_notifications_by_notification_id(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.notification_id && d.notification_id !== 0) return { ok: false, error: "Champ notification_id requis." };
    const query = d.query || "";
    const path = `/thirdparties/${encodeURIComponent(d.id)}/notifications/${encodeURIComponent(d.notification_id)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
