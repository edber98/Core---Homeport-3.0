const { utils } = require("./utils");

module.exports = {
  async ms_sp_list_items(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.listId) return { ok: false, error: "Missing listId." };

    let path = `/sites/${d.siteId}/lists/${d.listId}/items?expand=fields`;
    if (d.top) path += `&$top=${d.top}`;

    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = (res.data.value || []).map(i => ({
      id: i.id,
      fields: JSON.stringify(i.fields || {})
    }));
    return { ok: true, items };
  }
};
