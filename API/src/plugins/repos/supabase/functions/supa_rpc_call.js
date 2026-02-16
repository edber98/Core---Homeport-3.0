const { utils } = require("./utils");

module.exports = {
  async supa_rpc_call(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.functionName) return { ok: false, error: "Nom de la fonction requis." };

    let params = {};
    if (d.params) {
      try { params = typeof d.params === "string" ? JSON.parse(d.params) : d.params; } catch { return { ok: false, error: "JSON invalide." }; }
    }

    log('Appel API en cours...');
    const res = await utils.supaRequest(opts, `/rest/v1/rpc/${encodeURIComponent(d.functionName)}`, {
      method: "POST", body: params
    });
    if (!res.ok) return res;
    return { ok: true, data: JSON.stringify(res.data) };
  }
};
