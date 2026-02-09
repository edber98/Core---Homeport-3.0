module.exports = {
  async wa_upload_media(node, msg, inputs, opts) {
    const { getPhoneNumberId } = require("../utils").utils;
    const credentials = (opts && opts.credentials) || {};
    const accessToken = credentials.accessToken;
    if (!accessToken) return { ok: false, error: "Token d'accès WhatsApp manquant." };
    const args = node.args || {};
    const phoneNumberId = getPhoneNumberId(opts);
    const mediaUrl = args.media_url || "";
    if (!mediaUrl) return { ok: false, error: "URL du média manquante." };

    let mediaData;
    try {
      const mediaRes = await fetch(mediaUrl);
      mediaData = await mediaRes.arrayBuffer();
    } catch (e) { return { ok: false, error: `Impossible de récupérer le média: ${e.message}` }; }

    const mimeType = args.mime_type || "application/octet-stream";
    const blob = new Blob([mediaData], { type: mimeType });
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mimeType);
    formData.append("file", blob, args.filename || "file");

    let res;
    try {
      res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/media`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        body: formData
      });
    } catch (e) { return { ok: false, error: e.message }; }

    let data;
    try { data = await res.json(); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
    if (data.error) return { ok: false, error: data.error.message, details: data.error };
    return { ok: true, data };
  },

  async wa_get_media(node, msg, inputs, opts) {
    const credentials = (opts && opts.credentials) || {};
    const accessToken = credentials.accessToken;
    if (!accessToken) return { ok: false, error: "Token d'accès WhatsApp manquant." };
    const args = node.args || {};
    const mediaId = args.media_id || "";

    let res;
    try {
      res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
    } catch (e) { return { ok: false, error: e.message }; }

    let data;
    try { data = await res.json(); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
    if (data.error) return { ok: false, error: data.error.message, details: data.error };
    return { ok: true, data };
  }
};
