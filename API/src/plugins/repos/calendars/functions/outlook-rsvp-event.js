const { utils } = require("./utils");

// Map réponse Kinn → action Graph.
const ACTION = { accepted: "accept", tentative: "tentativelyAccept", declined: "decline" };

module.exports = {
  async outlook_rsvp_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.eventId) return { ok: false, error: "ID de l’événement manquant." };

    const response = String(d.response || "accepted").trim();
    const action = ACTION[response];
    if (!action) return { ok: false, error: `Réponse invalide: ${response}` };

    log(`RSVP (${response}) sur l’événement Outlook...`);
    const res = await utils.graphRequest(opts, `${utils.calendarBase(d.calendarId)}/events/${encodeURIComponent(d.eventId)}/${action}`, {
      method: "POST",
      body: { sendResponse: d.sendResponse !== false, comment: d.comment || "" },
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      ...utils.mapCalendarEvent({}, { id: d.eventId, calendarId: d.calendarId || "primary", status: "rsvped", response }),
    };
  }
};
