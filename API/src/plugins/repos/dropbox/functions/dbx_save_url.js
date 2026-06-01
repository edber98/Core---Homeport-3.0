const { utils } = require("./utils");
module.exports = {
  async dbx_save_url(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path || !d.url) return { ok: false, error: "path et url requis." };
    const res = await utils.dbxRequest(opts, "/files/save_url", { path: d.path, url: d.url });
    if (!res.ok) return res;
    return { ok: true, status: res.data?.['.tag'] || "", async_job_id: res.data?.async_job_id || "", result_json: JSON.stringify(res.data || {}) };
  }
};
