const { utils } = require("./utils");

module.exports = {
  async home_assistant_camera_snapshot_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const entityId = String(d.entityId || "").trim();
    if (!entityId) return { ok: false, error: "ID caméra requis." };
    const timestamp = d.timestamp || Date.now();
    log("Récupération de l'image caméra...");
    const res = await utils.homeAssistantRequest(opts, `/api/camera_proxy/${encodeURIComponent(entityId)}`, {
      query: { time: timestamp },
      rawResponse: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      entity_id: entityId,
      contentType: res.contentType || "image/jpeg",
      size: res.size || 0,
      dataBase64: res.data || ""
    };
  }
};
