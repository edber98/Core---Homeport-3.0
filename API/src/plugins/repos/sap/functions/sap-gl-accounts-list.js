const { utils } = require("./utils");

module.exports = {
  async sap_gl_accounts_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
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
  
      log('Récupération de la liste...');
      const res = await utils.sapRequest(
        opts,
        "/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_GLAccountInChartOfAccounts",
        { query }
      );
      if (!res.ok) return res;
      const results = (res.data && res.data.results) || (Array.isArray(res.data) ? res.data : []);
      return { ok: true, results };
    }
};
