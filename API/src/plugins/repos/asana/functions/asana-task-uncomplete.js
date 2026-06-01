const { utils } = require("./utils");

module.exports = {
  async asana_task_uncomplete(node, msg, inputs, opts) {
    const taskGid = (inputs && inputs.taskGid ? inputs.taskGid : "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };

    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}`, {
      method: "PUT",
      body: { data: { completed: false } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.data) || {};
    return utils.mapTask(r);
  }
};
