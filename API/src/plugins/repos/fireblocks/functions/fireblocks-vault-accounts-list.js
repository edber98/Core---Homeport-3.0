const { utils } = require("./utils");

module.exports = {
  async fireblocks_vault_accounts_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    log("Lecture des comptes vault Fireblocks...");
    const res = await utils.fireblocksRequest(opts, "/vault/accounts_paged", {
      query: { limit: utils.toInt(d.pageSize, 50), before: d.before, after: d.after, namePrefix: d.namePrefix }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = Array.isArray(res.data?.accounts) ? res.data.accounts : Array.isArray(res.data) ? res.data : [];
    const accounts = raw.map(utils.compactVaultAccount);
    return { ok: true, accounts, totalCount: accounts.length, before: res.data?.before || "", after: res.data?.after || "" };
  }
};
