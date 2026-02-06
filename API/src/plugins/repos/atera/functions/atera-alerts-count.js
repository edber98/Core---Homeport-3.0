const { utils } = require("./utils");

module.exports = {
  async atera_alerts_count(node, msg, inputs, opts) {
    const statuses = ["Open", "Resolved", "Snoozed"];
    const counts = {};

    for (const s of statuses) {
      const res = await utils.ateraRequest(opts, "/alerts", { query: { alertStatus: s, itemsInPage: 1 } });
      counts[s] = res.ok ? (res.data?.totalItemCount || 0) : 0;
    }

    return { ok: true, ...counts };
  }
};
