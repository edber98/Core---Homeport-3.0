const { utils } = require("./utils");

module.exports = {
  async qdrant_points_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collectionName) return { ok: false, error: "Collection requise." };
    const id = d.id;
    if (id === undefined || id === null || id === "") return { ok: false, error: "ID point requis." };

    let vectors, payload;
    try {
      vectors = utils.parseJsonInput(d.vector, "vector", undefined);
      payload = utils.parseJsonInput(d.payload, "payload", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    if (vectors === undefined && payload === undefined) return { ok: false, error: "vector ou payload requis." };

    const point = { id };
    if (vectors !== undefined) point.vector = vectors;
    if (payload !== undefined) point.payload = payload;

    const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points`, { method: "PUT", body: { points: [point] } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: String(id), status: res.data?.status || "updated", result_json: utils.compactJson(res.data) };
  }
};
