const { utils } = require("./utils");

module.exports = {
  async ms_sp_update_item(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.itemId) return { ok: false, error: "Missing itemId." };

    let fields = {};
    if (d.fields) {
      try { fields = typeof d.fields === "string" ? JSON.parse(d.fields) : d.fields; }
      catch { return { ok: false, error: "Invalid JSON in fields." }; }
    }

    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/lists/${d.listId}/items/${d.itemId}/fields`, {
      method: "PATCH",
      body: fields
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: d.itemId,
      fields: JSON.stringify(res.data || {})
    };
  }
};
