const { utils } = require("./utils");

module.exports = {
  async pipedrive_users_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.pdRequest(opts, "/users");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const hasMore = res.pagination?.more_items_in_collection ? "true" : "false";
    return { ok: true, hasMore, status: "success", message: JSON.stringify(results) };
  }
};
