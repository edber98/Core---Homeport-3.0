const { utils } = require('./utils');

module.exports = {
  async yousign_document_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const srId = String(d.signature_request_id || '').trim();
    if (!srId) return { ok: false, error: "L'ID de la demande de signature est requis." };

    const fileVal = d.file || d.content;
    if (!fileVal) return { ok: false, error: 'Le fichier est requis.' };

    const fileName = String(d.filename || 'document.pdf').trim();
    const nature = String(d.nature || 'signable_document');

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

    const boundary = `----YousignBoundary${Date.now()}`;
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`);
    parts.push(fileBuffer);
    parts.push('\r\n');
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="nature"\r\n\r\n${nature}\r\n`);
    parts.push(`--${boundary}--\r\n`);

    const body = Buffer.concat(parts.map((part) => typeof part === 'string' ? Buffer.from(part) : part));
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
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

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
};
