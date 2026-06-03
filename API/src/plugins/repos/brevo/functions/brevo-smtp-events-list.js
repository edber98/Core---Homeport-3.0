const { utils } = require("./utils");

module.exports = {
  async brevo_smtp_events_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {
      limit: d.limit || 50,
      offset: d.offset || 0,
      event: d.event || undefined,
      email: d.email || undefined,
      messageId: d.messageId || undefined
    };

    const res = await utils.brevoRequest(opts, "/smtp/statistics/events", { method: "GET", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = (res.data && (res.data.events || res.data.data || [])) || [];
    return { ok: true, items, totalCount: Number(items.length), nextCursor: "" };
  }
};
