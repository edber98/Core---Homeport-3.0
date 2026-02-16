const { utils } = require("./utils");

module.exports = {
  async atera_rates_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = d.page;
    if (d.itemsInPage) query.itemsInPage = d.itemsInPage;

    log('Récupération des données...');
    const res = await utils.ateraRequest(opts, "/rates/products", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, items: res.data?.items || [], totalItemCount: res.data?.totalItemCount };
  }
};
