const { utils } = require('./utils');

module.exports = {
  async ebay_message_conversation_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "https://api.ebay.com/commerce/message/v1/update_conversation";
    

    const query = {};
    

    const body = utils.buildBodyFromInputs(d, [{"source":"conversationId","target":"conversationId","type":"text"},{"source":"conversationStatus","target":"conversationStatus","type":"text"},{"source":"conversationType","target":"conversationType","type":"text"},{"source":"read","target":"read","type":"checkbox"}]);
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
