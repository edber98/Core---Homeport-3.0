const { utils } = require("./utils");

module.exports = {
  async atera_agent_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.agentId) return { ok: false, error: "Missing agentId." };

    const res = await utils.ateraRequest(opts, `/agents/${encodeURIComponent(d.agentId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
