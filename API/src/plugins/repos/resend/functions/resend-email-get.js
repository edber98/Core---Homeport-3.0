const { utils } = require("./utils");

module.exports = {
  async resend_email_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const emailId = String(d.emailId || "").trim();
    if (!emailId) return { ok: false, error: "ID email requis." };

    const res = await utils.resendRequest(opts, `/emails/${encodeURIComponent(emailId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactEmail(res.data || {}) };
  }
};
