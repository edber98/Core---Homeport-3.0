const { utils } = require("./utils");

module.exports = {
  async apify_task_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "name requis." };
    let input = undefined;
    try { input = utils.parseJsonInput(d.input, "input", undefined); } catch (e) { return { ok: false, error: e.message }; }
    const body = { name: String(d.name) };
    if (d.actId) body.actId = String(d.actId);
    if (input !== undefined) body.input = input;
    if (d.options) {
      try { body.options = utils.parseJsonInput(d.options, "options", undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    const res = await utils.apifyRequest(opts, "/actor-tasks", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data?.data || res.data || {};
    return { ok: true, id: String(r.id || ""), status: r.status || "", name: r.name || "", url: "", text: r.description || "", result_json: utils.compactJson(res.data) };
  }
};
