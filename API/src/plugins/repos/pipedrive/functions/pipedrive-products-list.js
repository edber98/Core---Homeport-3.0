const { utils } = require("./utils");

module.exports = {
  async pipedrive_products_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 10;
    const start = parseInt(d.start, 10) || 0;

    const res = await utils.pdRequest(opts, "/products", { query: { limit, start } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    return { ok: true, status: "success", message: JSON.stringify(results) };
  }
};
