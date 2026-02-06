const { utils } = require("./utils");

module.exports = {
  async atera_invoice_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = d.page;
    if (d.itemsInPage) query.itemsInPage = d.itemsInPage;

    const res = await utils.ateraRequest(opts, "/billing/invoices", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, items: res.data?.items || [], totalItemCount: res.data?.totalItemCount };
  }
};
