const { utils } = require("./utils");

module.exports = {
  async brevo_smtp_stats(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.startDate) query.startDate = d.startDate;
    if (d.endDate) query.endDate = d.endDate;

    log('Appel API en cours...');
    const res = await utils.brevoRequest(opts, "/smtp/statistics/events", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "success", message: JSON.stringify(res.data) };
  }
};
