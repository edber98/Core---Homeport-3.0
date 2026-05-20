const { utils } = require('./utils');

module.exports = {
  async yousign_webhook_event(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const data = (msg && msg.payload) || {};
      return {
        ok: true,
        event_name: data.event_name || '',
        event_time: data.event_time || '',
        signature_request_id: data.data?.signature_request?.id || '',
        signature_request_name: data.data?.signature_request?.name || '',
        signature_request_status: data.data?.signature_request?.status || '',
        signer_id: data.data?.signer?.id || '',
        signer_email: data.data?.signer?.info?.email || '',
        raw: data,
      };
    }
};
