const { utils } = require('./utils');

module.exports = {
  async yousign_documents_list(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const srId = String(d.signature_request_id || '').trim();
      if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
  
      log('Récupération de la liste...');
      const res = await utils.yousignRequest(opts, 'GET', `/signature_requests/${encodeURIComponent(srId)}/documents`);
      if (!res.ok) return res;
      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const documents = items.map(doc => ({
        id: doc.id || '',
        filename: doc.filename || '',
        nature: doc.nature || '',
        content_type: doc.content_type || '',
        total_pages: doc.total_pages || 0,
        created_at: doc.created_at || '',
      }));
      return { ok: true, documents, totalCount: String(documents.length) };
    }
};
