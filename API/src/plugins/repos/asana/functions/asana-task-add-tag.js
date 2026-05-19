const { utils } = require("./utils");

module.exports = {
  async asana_task_add_tag(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskGid = String(d.taskGid || "").trim();
    const tagGid = String(d.tagGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };
    if (!tagGid) return { ok: false, error: "Missing tagGid." };

    log("Ajout du tag...");
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/addTag`, {
      method: "POST",
      body: { data: { tag: tagGid } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "ok", id: taskGid };
  }
};
