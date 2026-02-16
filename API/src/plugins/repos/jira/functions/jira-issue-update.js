const { utils } = require("./utils");

module.exports = {
  async jira_issue_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const issueKey = (d.issueKey || "").trim();
    if (!issueKey) return { ok: false, error: "Missing issueKey." };

    const fields = {};
    if (d.summary) fields.summary = d.summary;
    if (d.description) fields.description = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: d.description }] }] };
    if (d.priority) fields.priority = { name: d.priority };
    if (d.assigneeAccountId) fields.assignee = { accountId: d.assigneeAccountId };

    if (Object.keys(fields).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.jiraRequest(opts, `/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      method: "PUT",
      body: { fields }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: "", key: issueKey, summary: d.summary || "", description: d.description || "", status: "", priority: d.priority || "", assignee: d.assigneeAccountId || "", reporter: "", issueType: "", projectKey: "", created: "", updated: new Date().toISOString() };
  }
};
