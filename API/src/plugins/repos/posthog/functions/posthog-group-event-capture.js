const { utils } = require("./utils");

module.exports = {
  async posthog_group_event_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const event = String(d.event || "").trim();
    const distinctId = String(d.distinctId || "").trim();
    const groupType = String(d.groupType || "").trim();
    const groupKey = String(d.groupKey || "").trim();
    if (!event) return { ok: false, error: "event requis." };
    if (!distinctId) return { ok: false, error: "distinctId requis." };
    if (!groupType) return { ok: false, error: "groupType requis." };
    if (!groupKey) return { ok: false, error: "groupKey requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let groups = {};
    try { groups = utils.parseJsonInput(d.groups, "groups", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }
    groups[groupType] = groupKey;

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event,
      distinct_id: distinctId,
      properties,
      groups
    };
    if (d.timestamp) payload.timestamp = String(d.timestamp);

    log("Capture de l'evenement groupe...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event, distinct_id: distinctId, group_type: groupType, group_key: groupKey, response: res.data };
  }
};
