const { utils } = require("./utils");

module.exports = {
  async datadog_event_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.title) return { ok: false, error: "Titre requis." };
    if (!d.text) return { ok: false, error: "Texte requis." };
    const body = utils.compact({
      title: d.title,
      text: d.text,
      priority: d.priority,
      alert_type: d.alertType,
      aggregation_key: d.aggregationKey,
      source_type_name: d.sourceTypeName,
      tags: utils.splitCsv(d.tags)
    });
    log("Création de l'événement...");
    const res = await utils.datadogRequest(opts, "/api/v1/events", { method: "POST", body, requireAppKey: false });
    if (!res.ok) return res;
    const event = res.data?.event || res.data || {};
    return { ok: true, id: event.id, title: event.title, url: event.url, raw: res.data };
  }
};
