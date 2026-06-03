const { utils } = require("./utils");
module.exports = {
  async monday_update_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const updateId = (d.updateId || "").toString().trim();
    if (!updateId) return { ok: false, error: "Missing updateId." };
    const query = `mutation { delete_update (id: ${updateId}) { id } }`;
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    return { ok: true, status: "deleted", message: `Update ${updateId} deleted.` };
  }
};
