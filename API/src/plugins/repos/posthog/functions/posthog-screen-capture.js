const { utils } = require("./utils");

module.exports = {
  async posthog_screen_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const distinctId = String(d.distinctId || "").trim();
    const screenName = String(d.screenName || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };
    if (!screenName) return { ok: false, error: "screenName requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }
    properties.$screen_name = screenName;

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event: "$screen",
      distinct_id: distinctId,
      properties
    };

    log("Capture de l'ecran...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event: "$screen", distinct_id: distinctId, screen_name: screenName, response: res.data };
  }
};
