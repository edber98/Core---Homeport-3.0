const { utils } = require("./utils");

module.exports = {
  async resend_domains_list(node, msg, inputs, opts) {
    const res = await utils.resendRequest(opts, "/domains");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const domains = (Array.isArray(res.data?.data) ? res.data.data : []).map(utils.compactDomain);
    return { ok: true, domains, totalCount: domains.length, hasMore: Boolean(res.data?.has_more) };
  }
};
