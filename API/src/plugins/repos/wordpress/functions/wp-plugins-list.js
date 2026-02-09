const { utils } = require("./utils");

module.exports = {
  async wp_plugins_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;

    const res = await utils.wpRequest(opts, "/plugins", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "success", message: JSON.stringify(res.data) };
  }
};
