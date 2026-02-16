const { utils } = require("./utils");

module.exports = {
  async atera_agent_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.agentId) return { ok: false, error: "Missing agentId." };

    log('Suppression en cours...');
    const res = await utils.ateraRequest(opts, `/agents/${encodeURIComponent(d.agentId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
