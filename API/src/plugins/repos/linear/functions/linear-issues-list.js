const { utils } = require("./utils");

module.exports = {
  async linear_issues_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const first = parseInt(d.first, 10) || 50;

    let filter = "";
    const variables = { first };
    if (d.teamId && d.teamId.trim()) {
      filter = ', filter: { team: { id: { eq: $teamId } } }';
      variables.teamId = d.teamId.trim();
    }

    const teamParam = variables.teamId ? "$teamId: String, " : "";
    const query = `query Issues(${teamParam}$first: Int!) {
      issues(first: $first${filter}) {
        nodes {
          id identifier title priority createdAt
          state { name }
          assignee { name }
        }
      }
    }`;

    const res = await utils.linearQuery(opts, query, variables);
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.issues && res.data.issues.nodes) || [];
    const issues = nodes.map(i => ({
      id: i.id || "", identifier: i.identifier || "", title: i.title || "",
      state: i.state ? i.state.name : "", priority: String(i.priority || 0),
      assignee: i.assignee ? i.assignee.name : "", createdAt: i.createdAt || ""
    }));
    return { ok: true, issues };
  }
};
