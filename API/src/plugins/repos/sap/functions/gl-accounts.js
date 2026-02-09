const { utils } = require("./utils");

module.exports = {
  /**
   * Get a GL Account by Chart of Accounts + GL Account number
   */
  async sap_gl_account_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.chartOfAccounts) return { ok: false, error: "Missing chartOfAccounts." };
    if (!d.glAccount) return { ok: false, error: "Missing glAccount." };

    const res = await utils.sapRequest(
      opts,
      `/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_GLAccountInChartOfAccounts(ChartOfAccounts='${d.chartOfAccounts}',GLAccount='${d.glAccount}')`
    );
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  },

  /**
   * List GL Accounts
   */
  async sap_gl_accounts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.top !== undefined && d.top !== null && d.top !== "") query["$top"] = d.top;
    if (d.skip !== undefined && d.skip !== null && d.skip !== "") query["$skip"] = d.skip;
    if (d.filter) query["$filter"] = d.filter;
    if (d.chartOfAccounts) {
      const existing = query["$filter"] || "";
      const coa = `ChartOfAccounts eq '${d.chartOfAccounts}'`;
      query["$filter"] = existing ? `${existing} and ${coa}` : coa;
    }

    const res = await utils.sapRequest(
      opts,
      "/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_GLAccountInChartOfAccounts",
      { query }
    );
    if (!res.ok) return res;
    const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
    return { ok: true, results };
  },
};
