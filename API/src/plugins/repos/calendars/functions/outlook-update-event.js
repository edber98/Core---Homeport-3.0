const { utils } = require("./utils");

module.exports = {
  async outlook_update_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.eventId) return { ok: false, error: "ID de l’événement manquant." };

    let patch = d.patch;
    if (typeof patch === "string") {
      try { patch = patch.trim() ? JSON.parse(patch) : {}; }
      catch { return { ok: false, error: "Patch JSON invalide." }; }
    }
    if (!patch || typeof patch !== "object") patch = {};
    // Normalise start/end si fournis en chaîne ISO.
    if (typeof patch.start === "string") patch.start = utils.toGraphDateTime(patch.start);
    if (typeof patch.end === "string") patch.end = utils.toGraphDateTime(patch.end);

    log("Mise à jour de l’événement Outlook...");
    const res = await utils.graphRequest(opts, `${utils.calendarBase(d.calendarId)}/events/${encodeURIComponent(d.eventId)}`, {
      method: "PATCH",
      body: patch,
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      ...utils.mapCalendarEvent(res.data || {}, { id: d.eventId, calendarId: d.calendarId || "primary", status: "updated" }),
    };
  }
};
