const { utils } = require("./utils");

module.exports = {
  async linear_issue_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueId = (d.issueId || "").trim();
    if (!issueId) return { ok: false, error: "Missing issueId." };

    const input = {};
    if (d.title) input.title = d.title;
    if (d.description) input.description = d.description;
    if (d.priority !== undefined && d.priority !== "") input.priority = parseInt(d.priority, 10);
    if (d.assigneeId) input.assigneeId = d.assigneeId;
    if (d.stateId) input.stateId = d.stateId;

    if (Object.keys(input).length === 0) return { ok: false, error: "No fields to update." };

    const query = `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id identifier title description url createdAt updatedAt
          priority
          state { name }
          assignee { name }
          team { name }
        }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { id: issueId, input });
    if (!res.ok) return { ok: false, error: res.error };

    const iu = (res.data && res.data.issueUpdate) || {};
    if (!iu.success) return { ok: false, error: "Issue update failed." };
    const i = iu.issue || {};
    return {
      ok: true, id: i.id || "", identifier: i.identifier || "", title: i.title || "",
      description: i.description || "", state: i.state ? i.state.name : "",
      priority: String(i.priority || 0), assignee: i.assignee ? i.assignee.name : "",
      teamName: i.team ? i.team.name : "", url: i.url || "",
      createdAt: i.createdAt || "", updatedAt: i.updatedAt || ""
    };
  }
};
