const { utils } = require("./utils");

module.exports = {
  async assemblyai_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};
    const fileVal = d.file || d.audioUrl;
    if (!fileVal) return { ok: false, error: "Fichier ou URL requis." };

    let buffer;
    try {
      if (opts.files && typeof fileVal === "object" && fileVal._type === "fileRef") {
        buffer = await opts.files.resolveAsBuffer(fileVal);
      } else if (opts.files && typeof fileVal === "string" && /^https?:\/\//i.test(fileVal)) {
        buffer = await opts.files.resolveAsBuffer(fileVal);
      } else {
        buffer = Buffer.isBuffer(fileVal) ? fileVal : Buffer.from(String(fileVal));
      }
    } catch (e) {
      return { ok: false, error: `Impossible de lire le fichier: ${e.message}` };
    }

    const res = await utils.assemblyaiRequest(opts, "/upload", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      rawBody: buffer
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: "",
      status: "uploaded",
      url: res.data?.upload_url || "",
      text: "",
      result_json: utils.compactJson(res.data)
    };
  }
};
