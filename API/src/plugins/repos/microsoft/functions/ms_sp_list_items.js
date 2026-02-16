const { utils } = require("./utils");

module.exports = {
  async ms_sp_list_items(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.listId) return { ok: false, error: "Missing listId." };

    let path = `/sites/${d.siteId}/lists/${d.listId}/items?expand=fields`;
    if (d.top) path += `&$top=${d.top}`;

    log('Récupération de la liste...');
    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = (res.data.value || []).map(i => ({
      id: i.id,
      fields: JSON.stringify(i.fields || {})
    }));
    const totalCount = res.data?.["@odata.count"] || items.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, items, totalCount, hasMore };
  }
};
