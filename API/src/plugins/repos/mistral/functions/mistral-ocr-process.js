const { utils } = require("./utils");

module.exports = {
  async mistral_ocr_process(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "mistral-ocr-latest").trim();
    const imageUrl = String(d.imageUrl || "").trim();
    const fileId = String(d.fileId || "").trim();
    if (!imageUrl && !fileId) return { ok: false, error: "imageUrl ou fileId requis." };

    const document = fileId ? { type: "file", file_id: fileId } : { type: "image_url", image_url: imageUrl };
    const body = {
      model,
      document,
      include_image_base64: !!d.includeImageBase64
    };

    const res = await utils.mistralRequest(opts, "/ocr", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: String(res.data?.id || ""),
      text: JSON.stringify(res.data?.pages || res.data?.data || {}),
      json: JSON.stringify(res.data || {})
    };
  }
};
