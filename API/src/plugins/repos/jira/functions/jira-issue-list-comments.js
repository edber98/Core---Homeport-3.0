const { utils } = require("./utils");

module.exports = {
  async jira_issue_list_comments(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };

    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const comments = Array.isArray(res.data?.comments) ? res.data.comments : [];
    return {
      ok: true,
      totalCount: Number(res.data?.total || comments.length),
      issues: comments.map((c) => ({
        id: c.id || "",
        key: issueKey,
        summary: c.body?.content?.[0]?.content?.[0]?.text || c.body || "",
        status: "comment",
        priority: "",
        assignee: c.author?.displayName || "",
        issueType: "comment",
        projectKey: "",
        created: c.created || ""
      }))
    };
  }
};
