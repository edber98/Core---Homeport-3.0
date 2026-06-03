const { utils } = require("./utils");

module.exports = {
  async asana_task_remove_tag(node, msg, inputs, opts) {
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    const tagGid = (d.tagGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };
    if (!tagGid) return { ok: false, error: "Missing tagGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/removeTag`, {
      method: "POST",
      body: { data: { tag: tagGid } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: `Tag ${tagGid} retire de la tache ${taskGid}.` };
  }
};
