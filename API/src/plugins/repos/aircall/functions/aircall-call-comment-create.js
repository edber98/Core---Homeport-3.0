const { utils } = require("./utils");

module.exports = {
  async aircall_call_comment_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const callId = String(d.callId || "").trim();
    const content = String(d.content || "").trim();
    if (!callId) return { ok: false, error: "ID d'appel requis." };
    if (!content) return { ok: false, error: "Commentaire requis." };

    const res = await utils.providerRequest(opts, `/v1/calls/${encodeURIComponent(callId)}/comments`, {
      method: "POST",
      body: { content }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status || 200,
      message: "Commentaire ajouté.",
      raw: res.data || null
    };
  }
};
