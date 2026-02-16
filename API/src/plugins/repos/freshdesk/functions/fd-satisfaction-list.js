const { utils } = require("./utils");

module.exports = {
  async fd_satisfaction_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);

    log('Récupération de la liste...');
    const res = await utils.freshdeskRequest(opts, "/surveys/satisfaction_ratings", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, totalCount: res.totalCount || 0, status: "success", message: JSON.stringify(res.data) };
  }
};
