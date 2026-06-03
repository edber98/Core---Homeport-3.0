const { utils } = require("./utils");

module.exports = {
  async fireblocks_vault_asset_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const vaultAccountId = String(d.vaultAccountId || "").trim();
    const assetId = String(d.assetId || "").trim();
    if (!vaultAccountId) return { ok: false, error: "ID compte vault requis." };
    if (!assetId) return { ok: false, error: "ID actif requis." };
    const res = await utils.fireblocksRequest(opts, `/vault/accounts/${encodeURIComponent(vaultAccountId)}/${encodeURIComponent(assetId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactVaultAsset(res.data || {}) };
  }
};
