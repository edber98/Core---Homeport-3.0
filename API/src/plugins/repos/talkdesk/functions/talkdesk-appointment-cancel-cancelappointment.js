const { utils } = require('./utils');

module.exports = {
  async talkdesk_appointment_cancel_cancelappointment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/healthcare/appointments/{appointment_id}";
    const appointment_id = String(d.appointment_id || '').trim();
    if (!appointment_id) return { ok: false, error: 'appointment_id requis.' };
    reqPath = reqPath.replace('{appointment_id}', encodeURIComponent(appointment_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
