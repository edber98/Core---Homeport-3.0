const { utils } = require("./utils");

module.exports = {
  async firebase_rtdb_value_push(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Chemin requis." };

    let value;
    try {
      value = utils.parseJsonInput(d.value, "Valeur");
    } catch (e) {
      return { ok: false, error: e.message };
    }

    let url;
    try {
      url = utils.realtimeDatabaseUrl((opts && opts.credentials) || {}, path);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Ajout d'une valeur Realtime Database...");
    const res = await utils.firebaseRequest(opts, url, { method: "POST", body: value });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: String((res.data && res.data.name) || ""),
      path,
      success: "true"
    };
  }
};
