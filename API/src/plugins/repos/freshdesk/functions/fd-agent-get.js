const { utils } = require("./utils");

module.exports = {
  async fd_agent_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const agentId = parseInt(d.agentId, 10);
    if (isNaN(agentId)) return { ok: false, error: "Missing agentId." };

    log('Récupération des données...');
    const res = await utils.freshdeskRequest(opts, `/agents/${agentId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const contact = r.contact || {};
    return { ok: true, id: String(r.id || ""), name: contact.name || "", email: contact.email || "", active: String(r.active || false), type: r.type || "" };
  }
};
