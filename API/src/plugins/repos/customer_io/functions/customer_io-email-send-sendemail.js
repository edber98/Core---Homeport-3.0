const { utils } = require('./utils');

module.exports = {
  async customer_io_email_send_sendemail(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/send/email";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"transactionalMessageId","target":"transactional_message_id","type":"object"},{"key":"messageBody","target":"body","type":"string"},{"key":"bodyAmp","target":"body_amp","type":"string"},{"key":"bodyPlain","target":"body_plain","type":"string"},{"key":"subject","target":"subject","type":"string"},{"key":"from","target":"from","type":"string"},{"key":"language","target":"language","type":"string"},{"key":"identifiers","target":"identifiers","type":"object"},{"key":"messageData","target":"message_data","type":"object"},{"key":"sendAt","target":"send_at","type":"number"},{"key":"disableMessageRetention","target":"disable_message_retention","type":"boolean"},{"key":"sendToUnsubscribed","target":"send_to_unsubscribed","type":"boolean"},{"key":"queueDraft","target":"queue_draft","type":"boolean"},{"key":"autoCreate","target":"auto_create","type":"boolean"},{"key":"to","target":"to","type":"string"},{"key":"bcc","target":"bcc","type":"string"},{"key":"fakeBcc","target":"fake_bcc","type":"boolean"},{"key":"replyTo","target":"reply_to","type":"string"},{"key":"preheader","target":"preheader","type":"string"},{"key":"attachments","target":"attachments","type":"object"},{"key":"requestHeaders","target":"headers","type":"string"},{"key":"disableCssPreprocessing","target":"disable_css_preprocessing","type":"boolean"},{"key":"tracked","target":"tracked","type":"boolean"}]);
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
