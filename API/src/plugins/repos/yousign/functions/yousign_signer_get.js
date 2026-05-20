const { utils } = require('./utils');

module.exports = {
  async yousign_signer_get(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const id = String(d.signer_id || '').trim();
      if (!id) return { ok: false, error: "L'ID du signataire est requis." };
  
      log('Récupération des données...');
      const res = await utils.yousignRequest(opts, 'GET', `/signers/${encodeURIComponent(id)}`);
      if (!res.ok) return res;
      const s = res.data || {};
      const si = s.info || {};
      return {
        ok: true,
        id: s.id || '',
        status: s.status || '',
        first_name: si.first_name || '',
        last_name: si.last_name || '',
        email: si.email || '',
        phone_number: si.phone_number || '',
        signature_level: s.signature_level || '',
        signature_link: s.signature_link || '',
        signed_at: s.signed_at || '',
        created_at: s.created_at || '',
      };
    }
};
