const { utils } = require('./utils');

module.exports = {
  async yousign_signers_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const srId = String(d.signature_request_id || '').trim();
      if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
  
      log('Récupération de la liste...');
      const res = await utils.yousignRequest(opts, 'GET', `/signature_requests/${encodeURIComponent(srId)}/signers`);
      if (!res.ok) return res;
      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const signers = items.map(s => {
        const si = s.info || {};
        return {
          id: s.id || '',
          status: s.status || '',
          first_name: si.first_name || '',
          last_name: si.last_name || '',
          email: si.email || '',
          signature_level: s.signature_level || '',
          signature_link: s.signature_link || '',
        };
      });
      return { ok: true, signers, totalCount: String(signers.length) };
    }
};
