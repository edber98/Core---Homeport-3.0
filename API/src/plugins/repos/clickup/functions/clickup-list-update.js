const { utils } = require("./utils");

module.exports = {
  async clickup_list_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const listId = String(d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.content) body.content = d.content;
    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.clickupRequest(opts, `/list/${encodeURIComponent(listId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id || listId, name: r.name || "", content: r.content || "", folderId: r.folder?.id || "", taskCount: String(r.task_count || "") };
  }
};
