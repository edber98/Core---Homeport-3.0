const { utils } = require("./utils");

module.exports = {
  async mixpanel_profile_track_charge(node, msg, inputs, opts) {
    const d = inputs || {};
    const distinctId = String(d.distinctId || "").trim();
    const amount = Number(d.amount);
    if (!distinctId) return { ok: false, error: "distinctId requis." };
    if (!Number.isFinite(amount)) return { ok: false, error: "amount numérique requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); } catch (e) { return { ok: false, error: e.message }; }

    const transaction = { $amount: amount, ...properties };
    if (d.time) transaction.$time = String(d.time);

    const res = await utils.mixpanelIngestRequest(opts, "/engage#profile-track-charge", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: { $token: token, $distinct_id: distinctId, $append: { $transactions: transaction } }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Transaction ajoutée au profil.", distinct_id: distinctId, raw: res.data };
  }
};
