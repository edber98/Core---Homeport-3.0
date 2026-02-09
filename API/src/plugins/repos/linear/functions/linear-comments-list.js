const { utils } = require("./utils");

module.exports = {
  async linear_comments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueId = (d.issueId || "").trim();
    if (!issueId) return { ok: false, error: "Missing issueId." };

    const query = `query IssueComments($id: String!) {
      issue(id: $id) {
        comments { nodes { id body createdAt user { name } } }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { id: issueId });
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.issue && res.data.issue.comments && res.data.issue.comments.nodes) || [];
    const comments = nodes.map(c => ({
      id: c.id || "", body: c.body || "",
      userName: c.user ? c.user.name : "", createdAt: c.createdAt || ""
    }));
    return { ok: true, comments };
  }
};
