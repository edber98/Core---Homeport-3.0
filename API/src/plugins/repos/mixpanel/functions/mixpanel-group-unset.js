const { utils } = require("./utils");

module.exports = {
  async mixpanel_group_unset(node, msg, inputs, opts) {
    const d = inputs || {};
    const groupKey = String(d.groupKey || "").trim();
    const groupId = String(d.groupId || "").trim();
    if (!groupKey || !groupId) return { ok: false, error: "groupKey et groupId sont requis." };

    let properties = d.properties;
    if (typeof properties === "string") {
      try { properties = JSON.parse(properties); } catch { return { ok: false, error: "JSON invalide dans properties." }; }
    }
    if (!Array.isArray(properties) || !properties.length) return { ok: false, error: "properties doit etre un tableau non vide." };

    let token;
    try { token = utils.ensureProjectToken(opts); } catch (e) { return { ok: false, error: e.message }; }

    const res = await utils.mixpanelIngestRequest(opts, "/groups#group-unset", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: { $token: token, $group_key: groupKey, $group_id: groupId, $unset: properties.map(String).filter(Boolean) }
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };
    return { ok: true, status: res.status, message: "Propriétés groupe supprimées.", group_key: groupKey, group_id: groupId, raw: res.data };
  }
};
