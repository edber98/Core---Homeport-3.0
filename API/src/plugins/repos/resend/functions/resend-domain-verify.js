const { utils } = require("./utils");

module.exports = {
  async resend_domain_verify(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const domainId = String(d.domainId || "").trim();
    if (!domainId) return { ok: false, error: "ID domaine requis." };

    log("Vérification du domaine...");
    const res = await utils.resendRequest(opts, `/domains/${encodeURIComponent(domainId)}/verify`, { method: "POST", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || domainId, success: true };
  }
};
