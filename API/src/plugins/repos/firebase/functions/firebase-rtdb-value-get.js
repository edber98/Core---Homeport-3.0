const { utils } = require("./utils");

module.exports = {
  async firebase_rtdb_value_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const path = String(d.path || "").trim();
    if (!path) return { ok: false, error: "Chemin Realtime Database requis." };

    let url;
    try { url = utils.realtimeDatabaseUrl(credentials, path); } catch (e) { return { ok: false, error: e.message }; }
    const res = await utils.firebaseRequest(opts, url);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, path, value: JSON.stringify(res.data) };
  }
};
