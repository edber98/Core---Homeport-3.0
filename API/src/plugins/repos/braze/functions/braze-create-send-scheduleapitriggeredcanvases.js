const { utils } = require('./utils');

module.exports = {
  async braze_create_send_scheduleapitriggeredcanvases(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/canvas/trigger/schedule/create";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const builtBody = utils.buildRequestBody(d, [{"key": "canvas_id", "type": "string"}, {"key": "send_id", "type": "string"}, {"key": "recipients", "type": "array"}, {"key": "audience", "type": "object"}, {"key": "broadcast", "type": "boolean"}, {"key": "trigger_properties", "type": "object"}, {"key": "schedule", "type": "object"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body || {};

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
