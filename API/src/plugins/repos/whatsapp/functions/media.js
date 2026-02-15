module.exports = {
  async wa_upload_media(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { getPhoneNumberId, resolveFileArg, uploadMediaBuffer } = require("../utils").utils;
    const credentials = (opts && opts.credentials) || {};
    const accessToken = credentials.accessToken;
    if (!accessToken) return { ok: false, error: "Token d'accès WhatsApp manquant." };
    const args = inputs || {};
    const phoneNumberId = getPhoneNumberId(opts);

    // Resolve fileRef, URL, or raw string
    let buffer, mimeType, filename;
    const fileData = await resolveFileArg(args.media_url, opts);
    if (fileData) {
      buffer = fileData.buffer;
      mimeType = args.mime_type || fileData.mimeType;
      filename = args.filename || fileData.name;
    } else if (typeof args.media_url === 'string' && args.media_url.trim() !== '') {
      // Legacy: plain URL string that resolveFileArg didn't catch
      try {
        const mediaRes = await fetch(args.media_url);
        buffer = Buffer.from(await mediaRes.arrayBuffer());
        mimeType = args.mime_type || mediaRes.headers.get('content-type') || 'application/octet-stream';
        filename = args.filename || 'file';
      } catch (e) { return { ok: false, error: `Impossible de récupérer le média: ${e.message}` }; }
    } else {
      return { ok: false, error: "Fichier média manquant." };
    }

    try {
      log('Téléversement en cours...');
      const data = await uploadMediaBuffer(opts, buffer, mimeType, filename);
      return { ok: true, ...(data || {}) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async wa_get_media(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const credentials = (opts && opts.credentials) || {};
    const accessToken = credentials.accessToken;
    if (!accessToken) return { ok: false, error: "Token d'accès WhatsApp manquant." };
    const args = inputs || {};
    const mediaId = args.media_id || "";

    let res;
    try {
      log('Récupération des données...');
      res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
    } catch (e) { return { ok: false, error: e.message }; }

    let data;
    try { data = await res.json(); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
    if (data.error) return { ok: false, error: data.error.message, details: data.error };
    return { ok: true, ...(data || {}) };
  }
};
