const { utils } = require("./utils");

module.exports = {
  async aircall_call_archive(node, msg, inputs, opts) {
    const d = inputs || {};
    const callId = String(d.callId || "").trim();
    if (!callId) return { ok: false, error: "ID d'appel requis." };

    const res = await utils.providerRequest(opts, `/v1/calls/${encodeURIComponent(callId)}/archive`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status || 200,
      message: "Appel archivé.",
      raw: res.data || null
    };
  }
};
