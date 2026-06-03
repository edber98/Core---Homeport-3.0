const { utils } = require("./utils");

module.exports = {
  async home_assistant_intent_handle(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom d'intent requis." };

    let data;
    try {
      data = utils.parseJsonInput(d.data, "données intent");
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Exécution de l'intent...");
    const res = await utils.homeAssistantRequest(opts, "/api/intent/handle", { method: "POST", body: { name, data: data || {} } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, name, response: res.data || {} };
  }
};
