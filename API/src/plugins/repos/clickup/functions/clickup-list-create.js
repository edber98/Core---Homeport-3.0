const { utils } = require("./utils");

module.exports = {
  async clickup_list_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const folderId = (d.folderId || "").trim();
    const name = (d.name || "").trim();
    if (!folderId) return { ok: false, error: "Missing folderId." };
    if (!name) return { ok: false, error: "Missing name." };

    const body = { name };
    if (d.content) body.content = d.content;

    const res = await utils.clickupRequest(opts, `/folder/${encodeURIComponent(folderId)}/list`, {
      method: "POST", body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true, id: r.id || "", name: r.name || "", content: r.content || "",
      folderId: folderId, taskCount: String(r.task_count || 0)
    };
  }
};
