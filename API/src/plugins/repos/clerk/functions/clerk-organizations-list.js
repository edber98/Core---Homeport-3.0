const { utils } = require("./utils");

module.exports = {
  async clerk_organizations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.clerkRequest(opts, "/organizations", { query: { limit: utils.toInt(d.pageSize, 50), offset: utils.toInt(d.offset, 0), query: d.query } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const organizations = utils.listData(res.data).map(utils.compactOrganization);
    return { ok: true, organizations, totalCount: res.data?.total_count || organizations.length };
  }
};
