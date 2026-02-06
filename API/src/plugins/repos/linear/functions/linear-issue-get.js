const { utils } = require("./utils");

module.exports = {
  async linear_issue_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueId = (d.issueId || "").trim();
    if (!issueId) return { ok: false, error: "Missing issueId." };

    const query = `query Issue($id: String!) {
      issue(id: $id) {
        id identifier title description url createdAt updatedAt
        priority
        state { name }
        assignee { name }
        team { name }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { id: issueId });
    if (!res.ok) return { ok: false, error: res.error };

    const i = (res.data && res.data.issue) || {};
    return {
      ok: true, id: i.id || "", identifier: i.identifier || "", title: i.title || "",
      description: i.description || "", state: i.state ? i.state.name : "",
      priority: String(i.priority || 0), assignee: i.assignee ? i.assignee.name : "",
      teamName: i.team ? i.team.name : "", url: i.url || "",
      createdAt: i.createdAt || "", updatedAt: i.updatedAt || ""
    };
  }
};
