const { utils } = require("./utils");

module.exports = {
  async posthog_event_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const event = String(d.event || "").trim();
    const distinctId = String(d.distinctId || "").trim();
    if (!event) return { ok: false, error: "event requis." };
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    if (utils.parseBoolean(d.anonymous, false) && properties.$process_person_profile === undefined) {
      properties.$process_person_profile = false;
    }

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event,
      distinct_id: distinctId,
      properties
    };
    if (d.timestamp) payload.timestamp = String(d.timestamp);

    log("Envoi de l'evenement... ");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      event,
      distinct_id: distinctId,
      response: res.data
    };
  }
};
