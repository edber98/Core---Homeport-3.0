const { utils } = require("./utils");
module.exports = {
  async monday_item_move_to_group(node, msg, inputs, opts) {
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    const groupId = (d.groupId || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    if (!groupId) return { ok: false, error: "Missing groupId." };
    const query = `mutation { move_item_to_group (item_id: ${itemId}, group_id: \"${groupId}\") { id group { id } } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const r = res.data.move_item_to_group || {};
    return { ok: true, id: r.id || itemId, group_id: r.group?.id || groupId, status: "moved" };
  }
};
