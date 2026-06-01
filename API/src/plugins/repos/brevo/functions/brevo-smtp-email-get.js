const { utils } = require("./utils");

module.exports = {
  async brevo_smtp_email_get(node, msg, inputs, opts) {
    const uuid = String((inputs && inputs.uuid) || "").trim();
    if (!uuid) return { ok: false, error: "Missing uuid." };

    const res = await utils.brevoRequest(opts, `/smtp/emails/${encodeURIComponent(uuid)}`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, messageId: res.data?.messageId || uuid, status: res.data?.event || "", subject: res.data?.subject || "", to: res.data?.to || "", from: res.data?.sender || "", date: res.data?.date || "" };
  }
};
