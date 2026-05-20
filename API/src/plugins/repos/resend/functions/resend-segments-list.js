const { utils } = require("./utils");

module.exports = {
  async resend_segments_list(node, msg, inputs, opts) {
    const res = await utils.resendRequest(opts, "/segments");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const segments = (Array.isArray(res.data?.data) ? res.data.data : []).map(utils.compactSegment);
    return { ok: true, segments, totalCount: segments.length, hasMore: Boolean(res.data?.has_more) };
  }
};
