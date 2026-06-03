const { utils } = require('./utils');

module.exports = {
  async brightdata_discover_list_tasks(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const res = await utils.providerRequest(opts, '/discover', { method: 'GET', query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const arr = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
    return { ok: true, items: arr, totalCount: Number(arr.length), nextCursor: '' };
  }
};
