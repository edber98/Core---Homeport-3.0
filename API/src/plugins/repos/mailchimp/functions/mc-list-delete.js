const { utils } = require("./utils");

module.exports = {
  async mc_list_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", id: String(d.listId) };
  }
};
