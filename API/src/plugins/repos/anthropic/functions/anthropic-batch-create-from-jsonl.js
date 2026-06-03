const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_create_from_jsonl(node, msg, inputs, opts) {
    const d = inputs || {};
    const jsonl = String(d.requestsJsonl || "").trim();
    if (!jsonl) return { ok: false, error: "requestsJsonl requis." };
    const requests = utils.parseJsonLines(jsonl);
    if (!Array.isArray(requests) || !requests.length) return { ok: false, error: "Aucune requête JSONL valide." };

    const res = await utils.anthropicRequest(opts, "/messages/batches", {
      method: "POST",
      body: { requests }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapBatch(res.data) };
  }
};
