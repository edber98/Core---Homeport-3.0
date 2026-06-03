const { utils } = require('./utils');

module.exports = {
  async convertkit_email_send_delete_a_sequence_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v4/sequences/{sequence_id}/emails/{id}";
    const sequence_id = String(d.sequence_id || '').trim();
    if (!sequence_id) return { ok: false, error: 'sequence_id requis.' };
    reqPath = reqPath.replace('{sequence_id}', encodeURIComponent(sequence_id));
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

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
