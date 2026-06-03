const { utils } = require("./utils");

module.exports = {
  async footstep_ai_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = String(d.query || "").trim();
    if (!query) return { ok: false, error: "Requête requise." };

    let context;
    try {
      context = utils.parseJsonInput(d.context, "contexte", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Interprétation de la requête...");
    const res = await utils.footstepRequest(opts, "/v1/ai/query", {
      method: "POST",
      body: utils.compactObject({ query, context })
    });
    if (!res.ok) return res;
    return {
      ok: true,
      intent: res.data?.intent,
      summary: res.data?.summary || res.data?.answer || res.data?.narrative,
      result: res.data?.result || res.data?.data || null,
      raw: res.data
    };
  }
};
