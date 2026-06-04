const { utils } = require('./utils');

module.exports = {
  async iterable_triggerworkflow_trigger_triggerworkflow(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/api/workflows/triggerWorkflow";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.workflowid !== undefined && d.workflowid !== null && d.workflowid !== '') {
      body["workflowid"] = d.workflowid;
    }
    if (d.email !== undefined && d.email !== null && d.email !== '') {
      body["email"] = d.email;
    }
    if (d.datafields !== undefined && d.datafields !== null && d.datafields !== '') {
      body["datafields"] = d.datafields;
    }
    if (d.listid !== undefined && d.listid !== null && d.listid !== '') {
      body["listid"] = d.listid;
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

