const { utils } = require('./utils');

module.exports = {
  async iterable_track_send_track(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/events/track";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.userid !== undefined && d.userid !== null && d.userid !== '') {
      body["userid"] = d.userid;
    }
    if (d.eventname !== undefined && d.eventname !== null && d.eventname !== '') {
      body["eventname"] = d.eventname;
    }
    if (d.createdat !== undefined && d.createdat !== null && d.createdat !== '') {
      body["createdat"] = d.createdat;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
    }
    if (d.campaignid !== undefined && d.campaignid !== null && d.campaignid !== '') {
      body["campaignid"] = d.campaignid;
    }
    if (d.templateid !== undefined && d.templateid !== null && d.templateid !== '') {
      body["templateid"] = d.templateid;
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

