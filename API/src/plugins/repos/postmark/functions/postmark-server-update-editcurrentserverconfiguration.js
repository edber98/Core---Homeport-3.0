const { utils } = require('./utils');

module.exports = {
  async postmark_server_update_editcurrentserverconfiguration(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/server";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"Name","target":"Name","type":"text"},{"source":"Color","target":"Color","type":"text"},{"source":"SmtpApiActivated","target":"SmtpApiActivated","type":"checkbox"},{"source":"RawEmailEnabled","target":"RawEmailEnabled","type":"checkbox"},{"source":"DeliveryType","target":"DeliveryType","type":"text"},{"source":"InboundHookUrl","target":"InboundHookUrl","type":"url"},{"source":"BounceHookUrl","target":"BounceHookUrl","type":"url"},{"source":"OpenHookUrl","target":"OpenHookUrl","type":"url"},{"source":"PostFirstOpenOnly","target":"PostFirstOpenOnly","type":"checkbox"},{"source":"TrackOpens","target":"TrackOpens","type":"checkbox"},{"source":"TrackLinks","target":"TrackLinks","type":"text"},{"source":"IncludeBounceContentInHook","target":"IncludeBounceContentInHook","type":"checkbox"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
