const { utils } = require("./utils");

module.exports = {
  async calendly_invitees_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.eventUuid || "").trim()) return { ok: false, error: "Missing eventUuid." };

    const query = {};
    if (d.count) query.count = d.count;
    if (d.pageToken) query.page_token = d.pageToken;

    log('Création en cours...');
    const res = await utils.calendlyRequest(opts, `/scheduled_events/${d.eventUuid}/invitees`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.collection) || [];
    const invitees = items.map(r => ({ uri: r.uri, name: r.name, email: r.email, status: r.status, createdAt: r.created_at }));
    return { ok: true, invitees , totalCount: invitees.length };
  }
};
