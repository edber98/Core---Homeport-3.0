const { utils } = require("./utils");

module.exports = {
  async mixpanel_event_track(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};
    const event = String(d.event || "").trim();
    const distinctId = String(d.distinctId || "").trim();
    if (!event) return { ok: false, error: "event requis." };
    if (!distinctId) return { ok: false, error: "distinctId requis." };

    let properties = {};
    try { properties = utils.parseJsonInput(d.properties, "properties", { defaultValue: {}, allowArray: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    let token;
    try { token = utils.ensureProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      event,
      properties: {
        token,
        distinct_id: distinctId,
        time: d.time ? Number(d.time) : undefined,
        ...properties
      }
    };

    log("Envoi d'un evenement a Mixpanel...");
    const res = await utils.mixpanelIngestRequest(opts, "/track", {
      query: { verbose: utils.toInt01(d.verbose, true), ip: utils.toInt01(d.ip, false) },
      body: payload
    });

    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    return {
      ok: true,
      status: res.status,
      message: "Evenement suivi.",
      event,
      distinct_id: distinctId,
      raw: res.data
    };
  }
};
