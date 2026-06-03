const { utils } = require("./utils");

module.exports = {
  async home_assistant_calendars_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Récupération des calendriers...");
    const res = await utils.homeAssistantRequest(opts, "/api/calendars");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const calendars = (Array.isArray(res.data) ? res.data : []).map((calendar) => ({
      entity_id: calendar.entity_id || "",
      name: calendar.name || calendar.entity_id || "",
      raw: calendar
    }));
    return { ok: true, calendars, totalCount: calendars.length };
  }
};
