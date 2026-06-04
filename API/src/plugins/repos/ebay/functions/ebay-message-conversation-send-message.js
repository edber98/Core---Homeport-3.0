const { utils } = require('./utils');

module.exports = {
  async ebay_message_conversation_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/commerce/message/v1/send_message";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"conversationId","target":"conversationId","type":"text"},{"source":"emailCopyToSender","target":"emailCopyToSender","type":"checkbox"},{"source":"messageMedia","target":"messageMedia","type":"json"},{"source":"messageText","target":"messageText","type":"text"},{"source":"otherPartyUsername","target":"otherPartyUsername","type":"text"},{"source":"reference","target":"reference","type":"json"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
