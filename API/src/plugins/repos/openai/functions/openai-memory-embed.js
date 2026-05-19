const { utils } = require("./utils");

module.exports = {
  async openai_memory_embed(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "text-embedding-3-small");
    let text = String(d.text || "");
    const incoming = (opts && opts.incoming && opts.incoming.byHandle) || {};
    const fromIn = Array.isArray(incoming.in) && incoming.in[0] ? incoming.in[0] : null;
    if (!text && fromIn && typeof fromIn === "object") text = String(fromIn.text || fromIn.content || fromIn.raw || fromIn.payload || "");

    log("Calcul des embeddings...");
    const res = await utils.openaiRequest(opts, "/embeddings", { model, input: [text] });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const vectors = Array.isArray(res.data?.data) ? res.data.data.map((item) => item.embedding || []) : [];
    return { ok: true, type: "ai_memory", texts: [text], vectorsCount: vectors.length, dimensions: vectors[0] ? vectors[0].length : 0 };
  }
};
