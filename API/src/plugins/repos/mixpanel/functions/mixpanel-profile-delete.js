const { utils } = require("./utils");

module.exports = {
  async mixpanel_profile_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let token;
    try { token = utils.ensureProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      $token: token,
      $distinct_id: distinctId,
      $delete: ""
    };

    const res = await utils.mixpanelIngestRequest(opts, "/engage#profile-delete", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: payload
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Profil supprime.", distinct_id: distinctId, raw: res.data };
  }
};
