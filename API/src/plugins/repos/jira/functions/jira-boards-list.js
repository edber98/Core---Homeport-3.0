const { utils } = require("./utils");

module.exports = {
  async jira_boards_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const maxResults = parseInt(d.maxResults, 10) || 50;

    log('Récupération de la liste...');
    const res = await utils.jiraRequest(opts, "/rest/agile/1.0/board", {
      query: { maxResults },
      agile: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.values) || [];
    const boards = results.map(r => ({
      id: String(r.id || ""),
      name: r.name || "",
      type: r.type || "",
      projectKey: r.location ? r.location.projectKey || "" : ""
    }));
    const totalCount = res.data?.total || 0;
    return { ok: true, totalCount, boards };
  }
};
