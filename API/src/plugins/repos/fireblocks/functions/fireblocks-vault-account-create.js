const { utils } = require("./utils");

module.exports = {
  async fireblocks_vault_account_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom requis." };
    const body = { name };
    if (d.customerRefId) body.customerRefId = String(d.customerRefId);
    if (d.hiddenOnUI !== undefined && d.hiddenOnUI !== "") body.hiddenOnUI = utils.parseBoolean(d.hiddenOnUI, false);
    if (d.autoFuel !== undefined && d.autoFuel !== "") body.autoFuel = utils.parseBoolean(d.autoFuel, false);
    log("Création du compte vault Fireblocks...");
    const res = await utils.fireblocksRequest(opts, "/vault/accounts", { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactVaultAccount(res.data || {}) };
  }
};
