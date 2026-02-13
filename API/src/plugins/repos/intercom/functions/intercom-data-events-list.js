const { utils } = require("./utils");

module.exports = {
  async intercom_data_events_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.userId || "").trim()) return { ok: false, error: "Missing userId." };

    const query = { type: d.type || "user", intercom_user_id: d.userId };
    log('Récupération de la liste...');
    const res = await utils.intercomRequest(opts, "/events", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const events = res.data?.events || res.data?.data || [];
    return { ok: true, status: "success", message: JSON.stringify(events), totalCount: res.data?.total_count || events.length, hasMore: !!res.data?.pages?.next };
  }
};
