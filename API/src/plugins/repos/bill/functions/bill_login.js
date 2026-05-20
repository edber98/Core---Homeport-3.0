const { utils } = require("./utils");

module.exports = {
  async bill_login(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {
      username: d.username || "",
      password: d.password || "",
      organizationId: d.organizationId || d.organization_id || ""
    };
    log("Connexion à BILL...");
    const res = await utils.billRequest(opts, "POST", "/v3/login", { auth: false, body });
    if (!res.ok) return res;
    const data = res.data || {};
    return { ok: true, sessionId: data.sessionId || data.session_id || "", organizationId: data.organizationId || data.organization_id || "" };
  }
};
