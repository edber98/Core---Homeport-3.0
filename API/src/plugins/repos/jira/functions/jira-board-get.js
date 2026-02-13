const { utils } = require("./utils");

module.exports = {
  async jira_board_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };

    log('Récupération des données...');
    const res = await utils.jiraRequest(opts, `/rest/agile/1.0/board/${encodeURIComponent(boardId)}`, {
      agile: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: String(r.id || ""),
      name: r.name || "",
      type: r.type || "",
      projectKey: r.location ? r.location.projectKey || "" : ""
    };
  }
};
