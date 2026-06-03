const { utils } = require("./utils");

module.exports = {
  async firebase_rtdb_value_set(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Chemin Realtime Database requis." };

    let value;
    try { value = utils.parseJsonInput(d.value, "Valeur"); } catch (e) { return { ok: false, error: e.message }; }
    let url;
    try { url = utils.realtimeDatabaseUrl(credentials, path); } catch (e) { return { ok: false, error: e.message }; }

    log("Écriture Realtime Database...");
    const res = await utils.firebaseRequest(opts, url, { method: "PUT", body: value });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, path, value: JSON.stringify(res.data) };
  }
};
