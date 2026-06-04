const { utils } = require('./utils');

module.exports = {
  async iterable_target_send_target(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/whatsApp/target";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.campaignid !== undefined && d.campaignid !== null && d.campaignid !== '') {
      body["campaignid"] = d.campaignid;
    }
    if (d.recipientemail !== undefined && d.recipientemail !== null && d.recipientemail !== '') {
      body["recipientemail"] = d.recipientemail;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
    }
    if (d.attachments !== undefined && d.attachments !== null && d.attachments !== '') {
      body["attachments"] = d.attachments;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

