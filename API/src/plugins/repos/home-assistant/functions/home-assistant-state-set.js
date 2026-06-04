const { utils } = require("./utils");

module.exports = {
  async home_assistant_state_set(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const entityId = String(d.entityId || "").trim();
    if (!entityId) return { ok: false, error: "ID entité requis." };
    if (d.state === undefined || d.state === null || d.state === "") return { ok: false, error: "État requis." };

    let attributes;
    try {
      attributes = utils.parseJsonInput(d.stateAttributes, "attributs");
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = { state: String(d.state) };
    if (attributes !== undefined) body.attributes = attributes;

    log("Définition de l'état...");
    const res = await utils.homeAssistantRequest(opts, `/api/states/${encodeURIComponent(entityId)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapState(res.data) };
  }
};
