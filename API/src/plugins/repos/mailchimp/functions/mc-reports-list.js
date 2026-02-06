const { utils } = require("./utils");

module.exports = {
  async mc_reports_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const count = parseInt(d.count, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;

    const res = await utils.mailchimpRequest(opts, "/reports", { query: { count, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "success", message: JSON.stringify(res.data) };
  }
};
