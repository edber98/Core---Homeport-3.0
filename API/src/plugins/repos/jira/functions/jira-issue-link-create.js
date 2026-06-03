const { utils } = require("./utils");

module.exports = {
  async jira_issue_link_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const inwardIssueKey = (d.inwardIssueKey || "").trim();
    const outwardIssueKey = (d.outwardIssueKey || "").trim();
    const typeName = (d.typeName || "Relates").trim();
    if (!inwardIssueKey || !outwardIssueKey) return { ok: false, error: "Missing inwardIssueKey/outwardIssueKey." };

    const res = await utils.jiraRequest(opts, "/rest/api/3/issueLink", {
      method: "POST",
      body: {
        type: { name: typeName },
        inwardIssue: { key: inwardIssueKey },
        outwardIssue: { key: outwardIssueKey }
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "linked", inwardIssueKey, outwardIssueKey, typeName };
  }
};
