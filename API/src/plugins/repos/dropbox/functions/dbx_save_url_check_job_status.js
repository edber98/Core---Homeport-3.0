const { utils } = require("./utils");
module.exports = {
  async dbx_save_url_check_job_status(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.async_job_id) return { ok: false, error: "async_job_id requis." };
    const res = await utils.dbxRequest(opts, "/files/save_url/check_job_status", { async_job_id: d.async_job_id });
    if (!res.ok) return res;
    return { ok: true, status: res.data?.['.tag'] || "", result_json: JSON.stringify(res.data || {}) };
  }
};
