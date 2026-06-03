const { utils } = require("./utils");

module.exports = {
  async home_assistant_calendar_events_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const entityId = String(d.entityId || "").trim();
    const start = String(d.start || "").trim();
    const end = String(d.end || "").trim();
    if (!entityId) return { ok: false, error: "ID calendrier requis." };
    if (!start) return { ok: false, error: "Date de début requise." };
    if (!end) return { ok: false, error: "Date de fin requise." };

    log("Récupération des événements calendrier...");
    const res = await utils.homeAssistantRequest(opts, `/api/calendars/${encodeURIComponent(entityId)}`, { query: { start, end } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const events = (Array.isArray(res.data) ? res.data : []).map((event) => ({
      summary: event.summary || "",
      description: event.description || "",
      location: event.location || "",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      raw: event
    }));
    return { ok: true, entity_id: entityId, events, totalCount: events.length };
  }
};
