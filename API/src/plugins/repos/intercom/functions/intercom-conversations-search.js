const { utils } = require("./utils");

module.exports = {
  async intercom_conversations_search(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = {
      pagination: { per_page: Math.max(1, Math.min(parseInt(d.perPage, 10) || 20, 150)) }
    };

    if (d.query) {
      if (typeof d.query === "object") body.query = d.query;
      else {
        try { body.query = JSON.parse(String(d.query)); } catch { return { ok: false, error: "JSON invalide dans query." }; }
      }
    }

    const res = await utils.intercomRequest(opts, "/conversations/search", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = Array.isArray(res.data?.conversations) ? res.data.conversations : [];
    const conversations = items.map((c) => ({
      id: c.id || "",
      title: c.title || "",
      state: c.state || "",
      priority: c.priority || "",
      adminAssigneeId: c.admin_assignee_id ? String(c.admin_assignee_id) : "",
      createdAt: c.created_at ? new Date(Number(c.created_at) * 1000).toISOString() : ""
    }));

    return { ok: true, conversations, totalCount: String(conversations.length) };
  }
};
