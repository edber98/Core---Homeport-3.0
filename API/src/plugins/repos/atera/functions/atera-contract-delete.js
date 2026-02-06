const { utils } = require("./utils");

module.exports = {
  async atera_contract_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.contractId) return { ok: false, error: "Missing contractId." };

    const res = await utils.ateraRequest(opts, `/contracts/${encodeURIComponent(d.contractId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
