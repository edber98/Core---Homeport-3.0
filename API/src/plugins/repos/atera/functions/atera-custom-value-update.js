const { utils } = require("./utils");

module.exports = {
  async atera_custom_value_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };
    if (!d.fieldName) return { ok: false, error: "Missing fieldName." };
    if (d.Value === undefined || d.Value === null) return { ok: false, error: "Missing Value." };

    log('Mise à jour en cours...');
    const res = await utils.ateraRequest(opts, `/customvalues/ticketfield/${encodeURIComponent(d.ticketId)}/${encodeURIComponent(d.fieldName)}`, {
      method: "PUT",
      body: { Value: String(d.Value) }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ActionID: "1" };
  }
};
