const { utils } = require("./utils");

module.exports = {
  async mixpanel_profile_set(node, msg, inputs, opts) {
    const d = inputs || {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let setValues = {};
    try { setValues = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      $token: token,
      $distinct_id: distinctId,
      $set: setValues
    };

    const res = await utils.mixpanelIngestRequest(opts, "/engage#profile-set", {
      query: { ip: utils.toInt01(d.ip, false), strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: payload
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Profil mis a jour.", distinct_id: distinctId, raw: res.data };
  }
};
