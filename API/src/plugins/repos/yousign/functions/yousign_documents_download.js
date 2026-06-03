const { utils } = require('./utils');

module.exports = {
  async yousign_documents_download(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const d = inputs || {};
      const srId = String(d.signature_request_id || '').trim();
      if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };
  
      const credentials = (opts && opts.credentials) || {};
      const apiKey = credentials.apiKey;
      if (!apiKey) return { ok: false, error: 'Clé API Yousign manquante.' };
      const env = String(credentials.environment || 'sandbox').toLowerCase();
      const baseUrl = utils.BASE_URLS[env] || utils.BASE_URLS.sandbox;
  
      const version = d.version || 'completed';
      const url = `${baseUrl}/signature_requests/${encodeURIComponent(srId)}/documents/download?version=${encodeURIComponent(version)}`;
  
      let res;
      try {
        log('Récupération des données...');
        res = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
      } catch (e) {
        return { ok: false, error: `Erreur réseau: ${e.message}` };
      }
  
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}`, status: res.status };
      }
  
      const buffer = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get('content-type') || 'application/zip';
      const ext = ct.includes('pdf') ? '.pdf' : '.zip';
      const name = `yousign_documents_${srId.slice(0, 8)}${ext}`;
  
      let file = null;
      if (opts.files) {
        file = await opts.files.store(buffer, {
          name,
          mimeType: ct,
          lifecycle: 'execution',
        });
      }
  
      return {
        ok: true,
        file,
        name,
        contentType: ct,
        size: buffer.length,
      };
    }
};
