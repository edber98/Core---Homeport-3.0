const { utils } = require("./utils");

module.exports = {
  async atera_contract_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.contractId) return { ok: false, error: "Missing contractId." };

    const res = await utils.ateraRequest(opts, `/contracts/${encodeURIComponent(d.contractId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
