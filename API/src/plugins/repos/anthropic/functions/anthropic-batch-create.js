const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let requests;
    try {
      requests = utils.parseJsonInput(d.requests, "Requêtes", null);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(requests) || !requests.length) {
      return { ok: false, error: "Au moins une requête est requise." };
    }

    log("Création du batch...");
    const res = await utils.anthropicRequest(opts, "/messages/batches", {
      method: "POST",
      body: { requests }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapBatch(res.data) };
  }
};
