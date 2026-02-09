const { utils } = require("./utils");

module.exports = {
  async salesforce_account_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const accountId = (d.accountId || "").toString().trim();
    if (!accountId) return { ok: false, error: "Missing accountId." };

    const res = await utils.sfRequest(opts, `/sobjects/Account/${encodeURIComponent(accountId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Account ${accountId} deleted.` };
  }
};
