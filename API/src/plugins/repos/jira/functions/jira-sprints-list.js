const { utils } = require("./utils");

module.exports = {
  async jira_sprints_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };

    const maxResults = parseInt(d.maxResults, 10) || 50;

    const res = await utils.jiraRequest(opts, `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint`, {
      query: { maxResults },
      agile: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.values) || [];
    const sprints = results.map(r => ({
      id: String(r.id || ""),
      name: r.name || "",
      state: r.state || "",
      startDate: r.startDate || "",
      endDate: r.endDate || ""
    }));
    return { ok: true, sprints };
  }
};
