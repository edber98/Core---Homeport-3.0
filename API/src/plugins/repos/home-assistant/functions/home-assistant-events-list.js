const { utils } = require("./utils");

module.exports = {
  async home_assistant_events_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const search = String(d.search || "").trim().toLowerCase();
    log("Récupération des événements...");
    const res = await utils.homeAssistantRequest(opts, "/api/events");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const events = (Array.isArray(res.data) ? res.data : [])
      .map((event) => ({
        event: event.event || "",
        listener_count: Number(event.listener_count || 0)
      }))
      .filter((event) => !search || String(event.event || "").toLowerCase().includes(search));
    return { ok: true, events, totalCount: events.length };
  }
};
