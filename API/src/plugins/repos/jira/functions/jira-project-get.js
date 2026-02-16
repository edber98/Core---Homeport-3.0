const { utils } = require("./utils");

module.exports = {
  async jira_project_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const projectKeyOrId = (d.projectKeyOrId || "").trim();
    if (!projectKeyOrId) return { ok: false, error: "Missing projectKeyOrId." };

    log('Récupération des données...');
    const res = await utils.jiraRequest(opts, `/rest/api/3/project/${encodeURIComponent(projectKeyOrId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || "",
      key: r.key || "",
      name: r.name || "",
      projectTypeKey: r.projectTypeKey || "",
      lead: r.lead ? r.lead.displayName : ""
    };
  }
};
