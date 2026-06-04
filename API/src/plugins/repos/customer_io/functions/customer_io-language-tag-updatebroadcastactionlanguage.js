const { utils } = require('./utils');

module.exports = {
  async customer_io_language_tag_updatebroadcastactionlanguage(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/broadcasts/{broadcast_id}/actions/{action_id}/language/{language}";
    const broadcast_id = String(d.broadcast_id || '').trim();
    if (!broadcast_id) return { ok: false, error: 'broadcast_id requis.' };
    reqPath = reqPath.replace('{broadcast_id}', encodeURIComponent(broadcast_id));
    const action_id = String(d.action_id || '').trim();
    if (!action_id) return { ok: false, error: 'action_id requis.' };
    reqPath = reqPath.replace('{action_id}', encodeURIComponent(action_id));
    const language = String(d.language || '').trim();
    if (!language) return { ok: false, error: 'language requis.' };
    reqPath = reqPath.replace('{language}', encodeURIComponent(language));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"id","target":"id","type":"number"},{"key":"broadcastId","target":"broadcast_id","type":"number"},{"key":"deduplicateId","target":"deduplicate_id","type":"string"},{"key":"name","target":"name","type":"string"},{"key":"layout","target":"layout","type":"string"},{"key":"created","target":"created","type":"number"},{"key":"updated","target":"updated","type":"number"},{"key":"messageBody","target":"body","type":"string"},{"key":"type","target":"type","type":"string"},{"key":"sendingState","target":"sending_state","type":"string"},{"key":"language","target":"language","type":"string"},{"key":"from","target":"from","type":"string"},{"key":"fromId","target":"from_id","type":"number"},{"key":"replyTo","target":"reply_to","type":"string"},{"key":"replyToId","target":"reply_to_id","type":["integer","null"]},{"key":"preprocessor","target":"preprocessor","type":"string"},{"key":"recipient","target":"recipient","type":"string"},{"key":"subject","target":"subject","type":"string"},{"key":"bcc","target":"bcc","type":"string"},{"key":"fakeBcc","target":"fake_bcc","type":"boolean"},{"key":"preheaderText","target":"preheader_text","type":"string"},{"key":"bodyAmp","target":"body_amp","type":"string"},{"key":"requestHeaders","target":"headers","type":"string"},{"key":"imageUrl","target":"image_url","type":"string"},{"key":"bodyJson","target":"body_json","type":"string"},{"key":"senderIdentityId","target":"sender_identity_id","type":"number"},{"key":"sendToUnsubscribed","target":"send_to_unsubscribed","type":"boolean"},{"key":"tracked","target":"tracked","type":"boolean"},{"key":"url","target":"url","type":"string"},{"key":"method","target":"method","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
