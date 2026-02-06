const { utils } = require("./utils");

module.exports = {
  async jira_sprint_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const sprintId = (d.sprintId || "").toString().trim();
    if (!sprintId) return { ok: false, error: "Missing sprintId." };

    const res = await utils.jiraRequest(opts, `/rest/agile/1.0/sprint/${encodeURIComponent(sprintId)}`, {
      agile: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: String(r.id || ""),
      name: r.name || "",
      state: r.state || "",
      startDate: r.startDate || "",
      endDate: r.endDate || "",
      goal: r.goal || ""
    };
  }
};
