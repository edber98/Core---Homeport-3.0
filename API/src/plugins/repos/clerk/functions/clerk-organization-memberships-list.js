const { utils } = require("./utils");

module.exports = {
  async clerk_organization_memberships_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/memberships`, { query: { limit: utils.toInt(d.pageSize, 50), offset: utils.toInt(d.offset, 0) } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const memberships = utils.listData(res.data).map(utils.compactMembership);
    return { ok: true, memberships, totalCount: res.data?.total_count || memberships.length };
  }
};
