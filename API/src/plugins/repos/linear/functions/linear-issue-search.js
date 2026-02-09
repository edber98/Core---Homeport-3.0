const { utils } = require("./utils");

module.exports = {
  async linear_issue_search(node, msg, inputs, opts) {
    const d = inputs || {};
    const searchQuery = (d.query || "").trim();
    if (!searchQuery) return { ok: false, error: "Missing query." };
    const first = parseInt(d.first, 10) || 25;

    const query = `query SearchIssues($term: String!, $first: Int) {
      searchIssues(term: $term, first: $first) {
        nodes {
          id identifier title priority createdAt
          state { name }
          assignee { name }
        }
      }
    }`;

    const res = await utils.linearQuery(opts, query, { term: searchQuery, first });
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.searchIssues && res.data.searchIssues.nodes) || [];
    const issues = nodes.map(i => ({
      id: i.id || "", identifier: i.identifier || "", title: i.title || "",
      state: i.state ? i.state.name : "", priority: String(i.priority || 0),
      assignee: i.assignee ? i.assignee.name : "", createdAt: i.createdAt || ""
    }));
    return { ok: true, issues };
  }
};
