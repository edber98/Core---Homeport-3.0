const { utils } = require("./utils");

module.exports = {
  async posthog_group_identify(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};

    const groupType = String(d.groupType || "").trim();
    const groupKey = String(d.groupKey || "").trim();
    const distinctId = String(d.distinctId || "groups_setup_id").trim();

    if (!groupType) return { ok: false, error: "groupType requis." };
    if (!groupKey) return { ok: false, error: "groupKey requis." };

    let groupSet = {};
    try {
      groupSet = utils.parseJsonInput(d.groupSet, "groupSet", { defaultValue: {}, allowArray: false });
    } catch (e) {
      return { ok: false, error: e.message };
    }

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event: "$groupidentify",
      distinct_id: distinctId,
      properties: {
        $group_type: groupType,
        $group_key: groupKey,
        $group_set: groupSet
      }
    };

    log("Mise a jour du groupe...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event: "$groupidentify", group_type: groupType, group_key: groupKey, response: res.data };
  }
};
