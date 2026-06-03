const { utils } = require("./utils");

module.exports = {
  async home_assistant_event_fire(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const eventType = String(d.eventType || "").trim();
    if (!eventType) return { ok: false, error: "Type d'événement requis." };

    let eventData;
    try {
      eventData = utils.parseJsonInput(d.eventData, "données événement");
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Émission de l'événement...");
    const res = await utils.homeAssistantRequest(opts, `/api/events/${encodeURIComponent(eventType)}`, { method: "POST", body: eventData || {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, event_type: eventType, message: res.data?.message || "Événement émis.", event_data: eventData || {} };
  }
};
