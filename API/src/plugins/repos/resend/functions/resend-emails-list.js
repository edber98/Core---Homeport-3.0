const { utils } = require("./utils");

module.exports = {
  async resend_emails_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    log("Lecture des emails envoyés...");
    const res = await utils.resendRequest(opts, "/emails", {
      query: { limit: utils.toInt(d.pageSize, 50), after: d.after, before: d.before }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const emails = (Array.isArray(res.data?.data) ? res.data.data : []).map(utils.compactEmail);
    return { ok: true, emails, totalCount: emails.length, hasMore: Boolean(res.data?.has_more) };
  }
};
