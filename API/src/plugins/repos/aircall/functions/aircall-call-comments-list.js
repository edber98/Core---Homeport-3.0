const { utils } = require("./utils");

module.exports = {
  async aircall_call_comments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const callId = String(d.callId || "").trim();
    if (!callId) return { ok: false, error: "ID d'appel requis." };

    const res = await utils.providerRequest(opts, `/v1/calls/${encodeURIComponent(callId)}/comments`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const rawItems = Array.isArray(payload.comments)
      ? payload.comments
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];
    const items = rawItems.map((r) => ({
      id: r && (r.id || r.uuid || ""),
      name: r && (r.content || r.body || ""),
      url: "",
      status: "",
      created_at: r && (r.created_at || r.createdAt || ""),
      updated_at: r && (r.updated_at || r.updatedAt || ""),
      raw: r
    }));

    return {
      ok: true,
      items,
      totalCount: Number(payload.total || payload.count || items.length),
      nextCursor: payload.next_cursor || payload.next || null
    };
  }
};
