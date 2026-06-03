const { utils } = require('./utils');

module.exports = {
  async yousign_signer_send_reminder(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const srId = String(d.signature_request_id || '').trim();
      const signerId = String(d.signer_id || '').trim();
      if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
      if (!signerId) return { ok: false, error: "L'ID du signataire est requis." };
  
      log('Création en cours...');
      const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(srId)}/signers/${encodeURIComponent(signerId)}/send_reminder`);
      if (!res.ok) return res;
      return { ok: true, sent: true, signer_id: signerId };
    }
};
