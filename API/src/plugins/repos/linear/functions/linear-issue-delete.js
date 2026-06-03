const { utils } = require("./utils");

module.exports = {
  async linear_issue_delete(node, msg, inputs, opts) {
    const issueId = (inputs?.issueId || "").trim();
    if (!issueId) return { ok: false, error: "Missing issueId." };

    const query = `mutation IssueArchive($id: String!) { issueArchive(id: $id) { success } }`;
    const res = await utils.linearQuery(opts, query, { id: issueId });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, id: issueId, status: "archived" };
  }
};
