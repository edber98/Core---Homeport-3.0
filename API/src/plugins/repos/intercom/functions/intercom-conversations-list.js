const { utils } = require("./utils");

module.exports = {
  async intercom_conversations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.perPage) query.per_page = d.perPage;
    if (d.startingAfter) query.starting_after = d.startingAfter;

    const res = await utils.intercomRequest(opts, "/conversations", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.conversations) || [];
    const conversations = items.map(r => ({ id: r.id, title: r.title || "", state: r.state || "", priority: r.priority || "", adminAssigneeId: r.admin_assignee_id?.toString() || "", createdAt: String(r.created_at || "") }));
    return { ok: true, conversations, totalCount: res.data?.total_count || conversations.length, hasMore: !!res.data?.pages?.next };
  }
};
