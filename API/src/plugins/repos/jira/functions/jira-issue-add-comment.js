const { utils } = require("./utils");

module.exports = {
  async jira_issue_add_comment(node, msg, inputs, opts) {
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    const body = (d.body || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };
    if (!body) return { ok: false, error: "Missing body." };

    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: "POST",
      body: {
        body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] }
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || "",
      body: body,
      authorName: r.author ? r.author.displayName : "",
      created: r.created || ""
    };
  }
};
