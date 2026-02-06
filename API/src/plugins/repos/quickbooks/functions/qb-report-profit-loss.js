const { utils } = require("./utils");

module.exports = {
  async qb_report_profit_loss(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.startDate) query.start_date = d.startDate;
    if (d.endDate) query.end_date = d.endDate;

    const res = await utils.qbRequest(opts, "/reports/ProfitAndLoss", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const header = r.Header || {};
    return { ok: true, reportName: header.ReportName || "ProfitAndLoss", startPeriod: header.StartPeriod || "", endPeriod: header.EndPeriod || "", currency: header.Currency || "", data: JSON.stringify(r.Rows || {}) };
  }
};
