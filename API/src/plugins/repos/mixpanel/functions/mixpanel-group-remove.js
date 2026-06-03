const { utils } = require("./utils");

module.exports = {
  async mixpanel_group_remove(node, msg, inputs, opts) {
    const d = inputs || {};
    const groupKey = String(d.groupKey || "").trim();
    const groupId = String(d.groupId || "").trim();
    if (!groupKey || !groupId) return { ok: false, error: "groupKey et groupId sont requis." };

    let values = {};
    try { values = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); } catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.mixpanelIngestRequest(opts, "/groups#group-remove", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: { $token: token, $group_key: groupKey, $group_id: groupId, $remove: values }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Valeurs retirées du groupe.", group_key: groupKey, group_id: groupId, raw: res.data };
  }
};
