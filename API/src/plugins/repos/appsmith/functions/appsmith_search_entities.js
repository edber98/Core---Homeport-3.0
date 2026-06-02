const { utils } = require("./utils");
module.exports = {
  async appsmith_search_entities(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.keyword !== undefined && d.keyword !== null && String(d.keyword).trim() !== "") query.keyword = String(d.keyword).trim();
    if (d.page !== undefined && d.page !== null && String(d.page).trim() !== "") query.page = String(d.page).trim();
    if (d.size !== undefined && d.size !== null && String(d.size).trim() !== "") query.size = String(d.size).trim();
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/search`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
