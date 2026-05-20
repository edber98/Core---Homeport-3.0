const { readJsonResponse } = require("./utils").utils;

module.exports = {
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
      try { data = await readJsonResponse(res); } catch (e) { return { ok: false, error: "Réponse invalide." }; }
      if (data.error) return { ok: false, error: data.error.message, details: data.error };
      return { ok: true, ...(data || {}) };
    }
};
