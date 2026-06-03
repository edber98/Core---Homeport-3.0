const { utils } = require("./utils");
module.exports = {
  async appsmith_page_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.branchedApplicationId !== undefined && d.branchedApplicationId !== null && String(d.branchedApplicationId).trim() !== "") query.branchedApplicationId = String(d.branchedApplicationId).trim();
    if (d.branchedPageId !== undefined && d.branchedPageId !== null && String(d.branchedPageId).trim() !== "") query.branchedPageId = String(d.branchedPageId).trim();
    if (d.mode !== undefined && d.mode !== null && String(d.mode).trim() !== "") query.mode = String(d.mode).trim();
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/pages`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.toArray(res.data); return { ok: true, items, totalCount: items.length, raw: res.data };
  }
};
