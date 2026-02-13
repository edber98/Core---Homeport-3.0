const { utils } = require("./utils");

module.exports = {
  async jira_sprint_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const boardId = (d.boardId || "").toString().trim();
    const name = (d.name || "").trim();
    if (!boardId) return { ok: false, error: "Missing boardId." };
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name, originBoardId: parseInt(boardId, 10) };
    if (d.startDate) body.startDate = d.startDate;
    if (d.endDate) body.endDate = d.endDate;
    if (d.goal) body.goal = d.goal;

    log('Création en cours...');
    const res = await utils.jiraRequest(opts, "/rest/agile/1.0/sprint", {
      method: "POST",
      body,
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
