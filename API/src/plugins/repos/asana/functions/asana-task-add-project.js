const { utils } = require("./utils");

module.exports = {
  async asana_task_add_project(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskGid = String(d.taskGid || "").trim();
    const projectGid = String(d.projectGid || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };
    if (!projectGid) return { ok: false, error: "Missing projectGid." };

    const data = { project: projectGid };
    if (d.sectionGid) data.section = d.sectionGid;
    if (d.insertBefore !== undefined && d.insertBefore !== "") data.insert_before = d.insertBefore || null;
    if (d.insertAfter !== undefined && d.insertAfter !== "") data.insert_after = d.insertAfter || null;

    log("Ajout au projet...");
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/addProject`, {
      method: "POST",
      body: { data }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "ok", id: taskGid };
  }
};
