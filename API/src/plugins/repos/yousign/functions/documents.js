const { utils } = require('./utils');

module.exports = {
  // ── Téléverser un document dans une demande ────────────
  async yousign_document_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const srId = String(d.signature_request_id || '').trim();
    if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };

    const fileVal = d.file || d.content;
    if (!fileVal) return { ok: false, error: 'Le fichier est requis.' };

    const fileName = String(d.filename || 'document.pdf').trim();
    const nature = String(d.nature || 'signable_document');

    // Resolve file to buffer
    let fileBuffer;
    if (fileVal && opts.files && typeof fileVal === 'object' && fileVal._type === 'fileRef') {
      fileBuffer = await opts.files.resolveAsBuffer(fileVal);
    } else if (fileVal && opts.files && typeof fileVal === 'string' && /^https?:\/\//i.test(fileVal)) {
      fileBuffer = await opts.files.resolveAsBuffer(fileVal);
    } else if (typeof fileVal === 'string' && /^[A-Za-z0-9+/=]+$/.test(fileVal.replace(/\s/g, '')) && fileVal.length > 100) {
      fileBuffer = Buffer.from(fileVal, 'base64');
    } else {
      return { ok: false, error: 'Format de fichier non supporté. Utilisez un fileRef, une URL ou du base64.' };
    }

    // Build multipart/form-data manually
    const boundary = `----YousignBoundary${Date.now()}`;
    const parts = [];

    // file part
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`);
    parts.push(fileBuffer);
    parts.push('\r\n');

    // nature part
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="nature"\r\n\r\n${nature}\r\n`);

    parts.push(`--${boundary}--\r\n`);

    const bodyParts = [];
    for (const p of parts) {
      bodyParts.push(typeof p === 'string' ? Buffer.from(p) : p);
    }
    const body = Buffer.concat(bodyParts);

    // Custom fetch for multipart
    const credentials = (opts && opts.credentials) || {};
    const apiKey = credentials.apiKey;
    const env = String(credentials.environment || 'sandbox').toLowerCase();
    const baseUrl = utils.BASE_URLS[env] || utils.BASE_URLS.sandbox;
    const url = `${baseUrl}/signature_requests/${encodeURIComponent(srId)}/documents/upload`;

    let res;
    try {
      log('Téléversement en cours...');
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Accept': 'application/json',
        },
        body,
      });
    } catch (e) {
      return { ok: false, error: `Erreur réseau: ${e.message}` };
    }

    const text = await res.text();
    let json = null;
    if (text) { try { json = JSON.parse(text); } catch { json = text; } }

    if (!res.ok) {
      const errMsg = json && typeof json === 'object' && json.detail ? json.detail : `HTTP ${res.status}`;
      return { ok: false, error: errMsg, status: res.status };
    }

    const doc = json || {};
    return {
      ok: true,
      id: doc.id || '',
      filename: doc.filename || '',
      nature: doc.nature || '',
      content_type: doc.content_type || '',
      total_pages: doc.total_pages || 0,
      created_at: doc.created_at || '',
    };
  },

  // ── Lister les documents d'une demande ─────────────────
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
  },

  // ── Télécharger les documents signés ───────────────────
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
  },

  // ── Télécharger la piste d'audit ───────────────────────
  async yousign_audit_trail_download(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const srId = String(d.signature_request_id || '').trim();
    if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };

    const credentials = (opts && opts.credentials) || {};
    const apiKey = credentials.apiKey;
    if (!apiKey) return { ok: false, error: 'Clé API Yousign manquante.' };
    const env = String(credentials.environment || 'sandbox').toLowerCase();
    const baseUrl = utils.BASE_URLS[env] || utils.BASE_URLS.sandbox;

    const url = `${baseUrl}/signature_requests/${encodeURIComponent(srId)}/audit_trails/download`;

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
    const name = `audit_trail_${srId.slice(0, 8)}.pdf`;

    let file = null;
    if (opts.files) {
      file = await opts.files.store(buffer, {
        name,
        mimeType: 'application/pdf',
        lifecycle: 'execution',
      });
    }

    return { ok: true, file, name, contentType: 'application/pdf', size: buffer.length };
  },
};
