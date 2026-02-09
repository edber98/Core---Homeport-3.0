const { utils } = require("./utils");

module.exports = {
  async calendly_event_types_list(node, msg, inputs, opts) {
    const d = inputs || {};
    let userUri = d.userUri;
    if (!userUri) userUri = await utils.getMyUserUri(opts);
    if (!userUri) return { ok: false, error: "Cannot resolve user URI." };

    const query = { user: userUri };
    if (d.active) query.active = d.active;
    if (d.count) query.count = d.count;
    if (d.pageToken) query.page_token = d.pageToken;

    const res = await utils.calendlyRequest(opts, "/event_types", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.collection) || [];
    const event_types = items.map(r => ({ uri: r.uri, name: r.name, slug: r.slug, duration: String(r.duration || ""), active: String(r.active) }));
    return { ok: true, event_types };
  }
};
