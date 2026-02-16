const { utils } = require("./utils");

module.exports = {
  async qb_report_balance_sheet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.startDate) query.start_date = d.startDate;
    if (d.endDate) query.end_date = d.endDate;

    log('Appel API en cours...');
    const res = await utils.qbRequest(opts, "/reports/BalanceSheet", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const header = r.Header || {};
    return { ok: true, reportName: header.ReportName || "BalanceSheet", startPeriod: header.StartPeriod || "", endPeriod: header.EndPeriod || "", currency: header.Currency || "", data: JSON.stringify(r.Rows || {}) };
  }
};
