const { utils } = require("./utils");

module.exports = {
  async mixpanel_events_import(node, msg, inputs, opts) {
    const d = inputs || {};
    let events;
    try { events = utils.parseJsonInput(d.events, "events", { defaultValue: [], allowArray: true, allowObject: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!Array.isArray(events) || !events.length) return { ok: false, error: "events doit etre un tableau non vide." };

    let token;
    try { token = utils.ensureProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const normalized = events.map((item) => {
      const x = utils.asObject(item);
      const props = utils.asObject(x.properties);
      return {
        event: String(x.event || "").trim(),
        properties: { token, ...props }
      };
    }).filter((e) => e.event);

    if (!normalized.length) return { ok: false, error: "Aucun evenement valide dans events." };

    const res = await utils.mixpanelIngestRequest(opts, "/import", {
      query: { strict: utils.toInt01(d.strict, false), verbose: utils.toInt01(d.verbose, true) },
      body: normalized
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, raw: res.details };

    return {
      ok: true,
      status: res.status,
      message: "Batch d'evenements importe.",
      sent_count: normalized.length,
      raw: res.data
    };
  }
};
