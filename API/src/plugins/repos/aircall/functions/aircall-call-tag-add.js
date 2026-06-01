const { utils } = require("./utils");

module.exports = {
  async aircall_call_tag_add(node, msg, inputs, opts) {
    const d = inputs || {};
    const callId = String(d.callId || "").trim();
    const name = String(d.tagName || "").trim();
    if (!callId) return { ok: false, error: "ID d'appel requis." };
    if (!name) return { ok: false, error: "Nom du tag requis." };

    const res = await utils.providerRequest(opts, `/v1/calls/${encodeURIComponent(callId)}/tags`, {
      method: "POST",
      body: { name }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status || 200,
      message: "Tag ajouté.",
      raw: res.data || null
    };
  }
};
