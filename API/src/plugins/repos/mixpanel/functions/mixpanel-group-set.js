const { utils } = require("./utils");

module.exports = {
  async mixpanel_group_set(node, msg, inputs, opts) {
    const d = inputs || {};
    const groupKey = String(d.groupKey || "").trim();
    const groupId = String(d.groupId || "").trim();
    if (!groupKey) return { ok: false, error: "groupKey requis." };
    if (!groupId) return { ok: false, error: "groupId requis." };

    let setValues = {};
    try { setValues = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      $token: token,
      $group_key: groupKey,
      $group_id: groupId,
      $set: setValues
    };

    const res = await utils.mixpanelIngestRequest(opts, "/groups#group-set", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: payload
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Groupe mis a jour.", group_key: groupKey, group_id: groupId, raw: res.data };
  }
};
