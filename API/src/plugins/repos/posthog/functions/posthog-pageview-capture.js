const { utils } = require("./utils");

module.exports = {
  async posthog_pageview_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const distinctId = String(d.distinctId || "").trim();
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    if (d.currentUrl && !properties.$current_url) properties.$current_url = String(d.currentUrl);

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event: "$pageview",
      distinct_id: distinctId,
      properties
    };

    log("Capture du pageview...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event: "$pageview", distinct_id: distinctId, response: res.data };
  }
};
