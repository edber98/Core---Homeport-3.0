const { utils } = require("./utils");

module.exports = {
  async fireblocks_vault_account_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const vaultAccountId = String(d.vaultAccountId || "").trim();
    if (!vaultAccountId) return { ok: false, error: "ID compte vault requis." };
    const res = await utils.fireblocksRequest(opts, `/vault/accounts/${encodeURIComponent(vaultAccountId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactVaultAccount(res.data || {}) };
  }
};
