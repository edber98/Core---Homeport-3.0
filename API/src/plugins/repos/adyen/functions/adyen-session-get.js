const { utils } = require("./utils");

module.exports = {
  async adyen_session_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const sessionId = String((inputs || {}).sessionId || "").trim();
    if (!sessionId) return { ok: false, error: "ID de session requis." };

    log("Récupération de la session...");
    const res = await utils.adyenRequest(opts, `/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return res;
    return {
      ok: true,
      id: res.data?.id,
      status: res.data?.status,
      resultCode: res.data?.resultCode,
      pspReference: res.data?.pspReference,
      amount: res.data?.amount || null,
      raw: res.data
    };
  }
};
