const { utils } = require("./utils");

module.exports = {
  async pl_payment_methods_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.plRequest(opts, "/payment_methods");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "success", message: JSON.stringify(res.data) };
  }
};
