const { utils } = require("./utils");

module.exports = {
  async sap_gl_account_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      if (!d.chartOfAccounts) return { ok: false, error: "Missing chartOfAccounts." };
      if (!d.glAccount) return { ok: false, error: "Missing glAccount." };
  
      log('Récupération des données...');
      const res = await utils.sapRequest(
        opts,
        `/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV/A_GLAccountInChartOfAccounts(ChartOfAccounts='${d.chartOfAccounts}',GLAccount='${d.glAccount}')`
      );
      if (!res.ok) return res;
      return { ok: true, ...res.data };
    }
};
