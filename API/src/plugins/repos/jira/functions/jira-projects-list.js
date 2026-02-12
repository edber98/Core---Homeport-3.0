const { utils } = require("./utils");

module.exports = {
  async jira_projects_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const maxResults = parseInt(d.maxResults, 10) || 50;

    const res = await utils.jiraRequest(opts, "/rest/api/3/project/search", {
      query: { maxResults }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.values) || [];
    const projects = results.map(r => ({
      id: r.id || "",
      key: r.key || "",
      name: r.name || "",
      projectTypeKey: r.projectTypeKey || "",
      lead: r.lead ? r.lead.displayName : ""
    }));
    const totalCount = res.data?.total || 0;
    return { ok: true, totalCount, projects };
  }
};
