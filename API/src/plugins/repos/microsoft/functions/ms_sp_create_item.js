const { utils } = require("./utils");

module.exports = {
  async ms_sp_create_item(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.siteId) return { ok: false, error: "Missing siteId." };
    if (!d.listId) return { ok: false, error: "Missing listId." };

    let fields = {};
    if (d.fields) {
      try { fields = typeof d.fields === "string" ? JSON.parse(d.fields) : d.fields; }
      catch { return { ok: false, error: "Invalid JSON in fields." }; }
    }

    const body = { fields };

    const res = await utils.graphRequest(opts, `/sites/${d.siteId}/lists/${d.listId}/items`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const i = res.data;
    return {
      ok: true,
      id: i.id,
      fields: JSON.stringify(i.fields || {})
    };
  }
};
