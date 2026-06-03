const { utils } = require("./utils");

module.exports = {
  async mixpanel_profile_union(node, msg, inputs, opts) {
    const d = inputs || {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let values = {};
    try { values = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); } catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.mixpanelIngestRequest(opts, "/engage#profile-union", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: { $token: token, $distinct_id: distinctId, $union: values }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Union appliquée au profil.", distinct_id: distinctId, raw: res.data };
  }
};
