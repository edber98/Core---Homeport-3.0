module.exports = {
  async wa_delete_media(node, msg, inputs, opts) {
    const { whatsappRequest } = require("./utils").utils;
    const args = inputs || {};
    if (!args.media_id) return { ok: false, error: "media_id requis." };
    const result = await whatsappRequest(opts, "DELETE", `/${encodeURIComponent(String(args.media_id))}`);
    if (!result.ok) return result;
    return { ok: true, status: "deleted", message: `Media ${args.media_id} supprimé.` };
  }
};
