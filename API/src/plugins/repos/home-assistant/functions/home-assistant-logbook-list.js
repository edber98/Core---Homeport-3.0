const { utils } = require("./utils");

module.exports = {
  async home_assistant_logbook_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const startTime = String(d.startTime || "").trim();
    const endTime = String(d.endTime || "").trim();
    const entityId = String(d.entityId || "").trim();
    const limit = utils.toPositiveInt(d.pageSize, 100, 1000);
    const path = startTime ? `/api/logbook/${encodeURIComponent(startTime)}` : "/api/logbook";
    const query = { end_time: endTime, entity: entityId };

    log("Lecture du journal...");
    const res = await utils.homeAssistantRequest(opts, path, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawEntries = Array.isArray(res.data) ? res.data : [];
    const entries = rawEntries.slice(0, limit).map((entry) => ({
      name: entry.name || "",
      entity_id: entry.entity_id || "",
      message: entry.message || "",
      when: entry.when || "",
      domain: entry.domain || "",
      raw: entry
    }));
    return { ok: true, entries, totalCount: entries.length };
  }
};
