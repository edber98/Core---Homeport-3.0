const { utils } = require("./utils");

module.exports = {
  async apollo_sequence_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const sequenceId = String(d.sequenceId || "").trim();
    if (!sequenceId) return { ok: false, error: "sequenceId requis." };
    const res = await utils.apiRequest(opts, `/emailer_campaigns/${encodeURIComponent(sequenceId)}`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.responseResult(res.data);
  }
};
