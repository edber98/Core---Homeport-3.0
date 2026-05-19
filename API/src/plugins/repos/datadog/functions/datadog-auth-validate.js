const { utils } = require("./utils");

module.exports = {
  async datadog_auth_validate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Validation de la clé API...");
    const res = await utils.datadogRequest(opts, "/api/v1/validate", { requireAppKey: false });
    if (!res.ok) return res;
    return { ok: true, valid: !!res.data?.valid, raw: res.data };
  }
};
