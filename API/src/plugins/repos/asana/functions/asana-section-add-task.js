const { utils } = require("./utils");

module.exports = {
  async asana_section_add_task(node, msg, inputs, opts) {
    const d = inputs || {};
    const sectionGid = (d.sectionGid || "").trim();
    const taskGid = (d.taskGid || "").trim();
    if (!sectionGid) return { ok: false, error: "Missing sectionGid." };
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const res = await utils.asanaRequest(opts, `/sections/${encodeURIComponent(sectionGid)}/addTask`, {
      method: "POST",
      body: { data: { task: taskGid } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: `Tâche ${taskGid} ajoutée à la section ${sectionGid}.` };
  }
};
