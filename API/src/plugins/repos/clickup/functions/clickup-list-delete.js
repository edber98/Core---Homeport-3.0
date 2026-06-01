const { utils } = require("./utils");

module.exports = {
  async clickup_list_delete(node, msg, inputs, opts) {
    const listId = String((inputs || {}).listId || "").trim();
    if (!listId) return { ok: false, error: "Missing listId." };
    const res = await utils.clickupRequest(opts, `/list/${encodeURIComponent(listId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: listId, success: "true" };
  }
};
