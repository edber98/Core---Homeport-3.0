const { utils } = require("./utils");

module.exports = {
  async clickup_list_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const listId = (d.listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };

    log('Récupération de la liste...');
    const res = await utils.clickupRequest(opts, `/list/${encodeURIComponent(listId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true, id: r.id || "", name: r.name || "", content: r.content || "",
      folderId: r.folder ? r.folder.id : "", taskCount: String(r.task_count || 0)
    };
  }
};
