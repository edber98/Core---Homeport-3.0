const { utils } = require("./utils");

module.exports = {
  async calendly_events_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let userUri = d.userUri;
    if (!userUri) userUri = await utils.getMyUserUri(opts);
    if (!userUri) return { ok: false, error: "Cannot resolve user URI." };

    const query = { user: userUri };
    if (d.status) query.status = d.status;
    if (d.count) query.count = d.count;
    if (d.pageToken) query.page_token = d.pageToken;

    log('Récupération de la liste...');
    const res = await utils.calendlyRequest(opts, "/scheduled_events", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.collection) || [];
    const events = items.map(r => ({ uri: r.uri, name: r.name, status: r.status, startTime: r.start_time, endTime: r.end_time, eventType: r.event_type, createdAt: r.created_at }));
    return { ok: true, events , totalCount: events.length };
  }
};
