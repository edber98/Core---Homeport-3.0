const { utils } = require("./utils");

module.exports = {
  async posthog_survey_event_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const event = String(d.event || "").trim();
    const distinctId = String(d.distinctId || "").trim();
    const surveyId = String(d.surveyId || "").trim();

    if (!event) return { ok: false, error: "event requis." };
    if (!distinctId) return { ok: false, error: "distinctId requis." };
    if (!surveyId) return { ok: false, error: "surveyId requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }
    properties.$survey_id = surveyId;

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      event,
      distinct_id: distinctId,
      properties
    };

    log("Capture d'un evenement survey...");
    const res = await utils.posthogPublicRequest(opts, "/i/v0/e/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, event, distinct_id: distinctId, survey_id: surveyId, response: res.data };
  }
};
