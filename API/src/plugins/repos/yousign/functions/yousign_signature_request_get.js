const { utils } = require('./utils');

module.exports = {
  async yousign_signature_request_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.signature_request_id || '').trim();
      if (!id) return { ok: false, error: "L'ID de la demande est requis." };
  
      log('Récupération des données...');
      const res = await utils.yousignRequest(opts, 'GET', `/signature_requests/${encodeURIComponent(id)}`);
      if (!res.ok) return res;
      const sr = res.data || {};
      return {
        ok: true,
        id: sr.id || '',
        name: sr.name || '',
        status: sr.status || '',
        delivery_mode: sr.delivery_mode || '',
        created_at: sr.created_at || '',
        expiration_date: sr.expiration_date || '',
        external_id: sr.external_id || '',
        ordered_signers: sr.ordered_signers || false,
        signers: sr.signers || [],
        documents: sr.documents || [],
        approvers: sr.approvers || [],
      };
    }
};
