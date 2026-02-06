const { utils } = require("./utils");

module.exports = {
  async typeform_image_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.url || "").trim()) return { ok: false, error: "Missing image URL." };
    if (!(d.fileName || "").trim()) return { ok: false, error: "Missing fileName." };

    const body = { url: d.url, file_name: d.fileName };
    const res = await utils.typeformRequest(opts, "/images", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "uploaded", message: res.data?.src || "Image téléversée." };
  }
};
