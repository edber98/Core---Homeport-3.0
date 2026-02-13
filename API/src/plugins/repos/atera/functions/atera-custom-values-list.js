const { utils } = require("./utils");

module.exports = {
  async atera_custom_values_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.ateraRequest(opts, "/customvalues/customfields");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = Array.isArray(res.data) ? res.data : [];
    return { ok: true, items };
  }
};
