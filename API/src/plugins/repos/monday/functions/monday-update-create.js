const { utils } = require("./utils");
module.exports = {
  async monday_update_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    const body = (d.body || "").trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    if (!body) return { ok: false, error: "Missing body." };
    const escapedBody = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const query = `mutation { create_update (item_id: ${itemId}, body: "${escapedBody}") { id body creator_id created_at } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const r = res.data.create_update || {};
    return { ok: true, id: r.id, body: r.body, creator_id: r.creator_id, created_at: r.created_at };
  }
};
