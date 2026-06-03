const { utils } = require("./utils");
module.exports = {
  async monday_item_archive(node, msg, inputs, opts) {
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    const query = `mutation { archive_item (item_id: ${itemId}) { id state } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    return { ok: true, status: "archived", message: `Item ${itemId} archived.` };
  }
};
