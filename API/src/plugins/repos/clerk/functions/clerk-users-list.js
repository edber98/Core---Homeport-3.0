const { utils } = require("./utils");

module.exports = {
  async clerk_users_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.clerkRequest(opts, "/users", {
      query: { limit: utils.toInt(d.pageSize, 50), offset: utils.toInt(d.offset, 0), query: d.query, email_address: d.emailAddress, organization_id: d.organizationId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const users = utils.listData(res.data).map(utils.compactUser);
    return { ok: true, users, totalCount: res.data?.total_count || users.length };
  }
};
