const { utils } = require("./utils");

module.exports = {
  async home_assistant_state_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const entityId = String(d.entityId || "").trim();
    const confirmDelete = d.confirmDelete === true || d.confirmDelete === "true" || d.confirmDelete === 1 || d.confirmDelete === "1";
    if (!entityId) return { ok: false, error: "ID entité requis." };
    if (!confirmDelete) return { ok: false, error: "Confirmation de suppression requise." };

    log("Suppression de l'état...");
    const res = await utils.homeAssistantRequest(opts, `/api/states/${encodeURIComponent(entityId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, entity_id: entityId, deleted: true, message: "État supprimé." };
  }
};
