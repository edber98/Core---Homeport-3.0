const { utils } = require("./utils");

module.exports = {
  async pipedrive_users_list(node, msg, inputs, opts) {
    const res = await utils.pdRequest(opts, "/users");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    return { ok: true, status: "success", message: JSON.stringify(results) };
  }
};
