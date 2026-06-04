const { utils } = require('./utils');

module.exports = {
  async customer_io_trigger_tag_triggerbroadcast(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/campaigns/{broadcast_id}/triggers";
    const broadcast_id = String(d.broadcast_id || '').trim();
    if (!broadcast_id) return { ok: false, error: 'broadcast_id requis.' };
    reqPath = reqPath.replace('{broadcast_id}', encodeURIComponent(broadcast_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"requestData","target":"data","type":"object"},{"key":"emailAddDuplicates","target":"email_add_duplicates","type":"boolean"},{"key":"emailIgnoreMissing","target":"email_ignore_missing","type":"boolean"},{"key":"idIgnoreMissing","target":"id_ignore_missing","type":"boolean"},{"key":"recipients","target":"recipients","type":"object"},{"key":"emails","target":"emails","type":"array"},{"key":"ids","target":"ids","type":"array"},{"key":"perUserData","target":"per_user_data","type":"array"},{"key":"dataFileUrl","target":"data_file_url","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
