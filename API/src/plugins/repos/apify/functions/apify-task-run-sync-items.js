const { utils } = require("./utils");

module.exports = {
  async apify_task_run_sync_items(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.taskId) return { ok: false, error: "taskId requis." };
    let input = {};
    try { input = utils.parseJsonInput(d.input, "input", {}); } catch (e) { return { ok: false, error: e.message }; }
    const path = `/actor-tasks/${encodeURIComponent(String(d.taskId))}/run-sync-get-dataset-items`;
    const query = {};
    if (d.clean !== undefined && d.clean !== null && d.clean !== "") query.clean = d.clean;
    if (d.limit !== undefined && d.limit !== null && d.limit !== "") query.limit = d.limit;

    const res = await utils.apifyRequest(opts, path, { method: "POST", query, body: input });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = Array.isArray(res.data) ? res.data : utils.asArray(res.data);
    const items = rawItems.map(utils.itemFromUnknown);
    return { ok: true, items, totalCount: items.length, nextCursor: "" };
  }
};
