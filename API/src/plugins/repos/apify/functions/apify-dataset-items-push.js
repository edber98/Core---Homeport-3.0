const { utils } = require("./utils");

module.exports = {
  async apify_dataset_items_push(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.datasetId) return { ok: false, error: "datasetId requis." };
    let items;
    try { items = utils.parseJsonInput(d.items, "items", undefined); } catch (e) { return { ok: false, error: e.message }; }
    if (!Array.isArray(items) || !items.length) return { ok: false, error: "items doit être un tableau JSON non vide." };
    const path = `/datasets/${encodeURIComponent(String(d.datasetId))}/items`;
    const res = await utils.apifyRequest(opts, path, { method: "POST", body: items });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: String(d.datasetId), status: "pushed", name: "", url: "", text: `${items.length} items ajoutés.`, result_json: utils.compactJson(res.data) };
  }
};
