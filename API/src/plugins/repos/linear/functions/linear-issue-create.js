const { utils } = require("./utils");

module.exports = {
  async linear_issue_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    const title = (d.title || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };
    if (!title) return { ok: false, error: "Missing title." };

    const variables = { teamId, title };
    if (d.description) variables.description = d.description;
    if (d.priority !== undefined && d.priority !== "") variables.priority = parseInt(d.priority, 10);
    if (d.assigneeId) variables.assigneeId = d.assigneeId;

    const query = `mutation IssueCreate($teamId: String!, $title: String!, $description: String, $priority: Int, $assigneeId: String) {
      issueCreate(input: { teamId: $teamId, title: $title, description: $description, priority: $priority, assigneeId: $assigneeId }) {
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

    const res = await utils.linearQuery(opts, query, variables);
    if (!res.ok) return { ok: false, error: res.error };

    const ic = (res.data && res.data.issueCreate) || {};
    if (!ic.success) return { ok: false, error: "Issue creation failed." };
    const i = ic.issue || {};
    return {
      ok: true, id: i.id || "", identifier: i.identifier || "", title: i.title || "",
      description: i.description || "", state: i.state ? i.state.name : "",
      priority: String(i.priority || 0), assignee: i.assignee ? i.assignee.name : "",
      teamName: i.team ? i.team.name : "", url: i.url || "",
      createdAt: i.createdAt || "", updatedAt: i.updatedAt || ""
    };
  }
};
