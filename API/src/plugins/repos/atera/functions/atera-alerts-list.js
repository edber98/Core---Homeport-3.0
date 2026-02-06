const { utils } = require("./utils");

module.exports = {
  async atera_alerts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = d.page;
    if (d.itemsInPage) query.itemsInPage = d.itemsInPage;
    if (d.alertStatus) query.alertStatus = d.alertStatus;

    const res = await utils.ateraRequest(opts, "/alerts", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, items: res.data?.items || [], totalItemCount: res.data?.totalItemCount };
  }
};
