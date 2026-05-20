const { utils } = require("./utils");

module.exports = {
  async posthog_events_batch_capture(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};

    let batch;
    try { batch = utils.parseJsonInput(d.batch, "batch", { defaultValue: [], allowArray: true, allowObject: false }); }
    catch (e) { return { ok: false, error: e.message }; }

    if (!Array.isArray(batch) || batch.length === 0) return { ok: false, error: "batch doit contenir au moins un evenement." };

    let token;
    try { token = utils.getProjectToken(opts); }
    catch (e) { return { ok: false, error: e.message }; }

    const payload = {
      api_key: token,
      historical_migration: utils.parseBoolean(d.historicalMigration, false),
      batch
    };

    log("Envoi du batch d'evenements...");
    const res = await utils.posthogPublicRequest(opts, "/batch/", { method: "POST", body: payload });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      sentCount: batch.length,
      historicalMigration: payload.historical_migration,
      response: res.data
    };
  }
};
