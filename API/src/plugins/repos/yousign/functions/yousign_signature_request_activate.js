const { utils } = require('./utils');

module.exports = {
  async yousign_signature_request_activate(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.signature_request_id || '').trim();
      if (!id) return { ok: false, error: "L'ID de la demande est requis." };
  
      log('Appel API en cours...');
      const res = await utils.yousignRequest(opts, 'POST', `/signature_requests/${encodeURIComponent(id)}/activate`);
      if (!res.ok) return res;
      const sr = res.data || {};
      return {
        ok: true,
        id: sr.id || '',
        name: sr.name || '',
        status: sr.status || '',
        created_at: sr.created_at || '',
      };
    }
};
