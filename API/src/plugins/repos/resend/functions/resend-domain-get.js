const { utils } = require("./utils");

module.exports = {
  async resend_domain_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const domainId = String(d.domainId || "").trim();
    if (!domainId) return { ok: false, error: "ID domaine requis." };

    const res = await utils.resendRequest(opts, `/domains/${encodeURIComponent(domainId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactDomain(res.data || {}) };
  }
};
