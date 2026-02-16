const { utils } = require("./utils");

module.exports = {
  async clickup_task_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    const name = (d.name || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.description) body.description = d.description;
    if (d.priority) body.priority = parseInt(d.priority, 10);
    if (d.due_date) body.due_date = d.due_date;
    if (d.assignees) body.assignees = d.assignees.split(",").map(s => parseInt(s.trim(), 10));

    log('Création en cours...');
    const res = await utils.clickupRequest(opts, `/list/${encodeURIComponent(listId)}/task`, {
      method: "POST", body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true, id: r.id || "", name: r.name || "", description: r.description || "",
      status: r.status ? r.status.status : "", priority: r.priority ? r.priority.priority : "",
      assignees: (r.assignees || []).map(a => a.username || a.id).join(", "),
      due_date: r.due_date || "", listId: listId, url: r.url || "",
      date_created: r.date_created || ""
    };
  }
};
