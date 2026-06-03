const { utils } = require("./utils");

module.exports = {
  async fireblocks_vault_account_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const vaultAccountId = String(d.vaultAccountId || "").trim();
    if (!vaultAccountId) return { ok: false, error: "ID compte vault requis." };
    const body = {};
    if (d.name) body.name = String(d.name).trim();
    if (d.customerRefId !== undefined) body.customerRefId = String(d.customerRefId || "");
    if (d.autoFuel !== undefined && d.autoFuel !== "") body.autoFuel = utils.parseBoolean(d.autoFuel, false);
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à modifier." };
    log("Mise à jour du compte vault...");
    const res = await utils.fireblocksRequest(opts, `/vault/accounts/${encodeURIComponent(vaultAccountId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactVaultAccount(res.data || {}) };
  }
};
