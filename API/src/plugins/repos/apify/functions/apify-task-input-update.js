const { utils } = require("./utils");

module.exports = {
  async apify_task_input_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    let input;
    try { input = utils.parseJsonInput(d.input, "input", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (input === undefined) return { ok: false, error: "input requis." };
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}/input`;
    const res = await utils.apifyRequest(opts, path, { method: "PUT", body: input });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(d.taskId), status: "updated", name: "task_input", url: "", text: "Input mis à jour.", result_json: utils.compactJson(res.data) };
  }
};
