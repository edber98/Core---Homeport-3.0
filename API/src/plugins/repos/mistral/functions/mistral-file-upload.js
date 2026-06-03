module.exports = {
  async mistral_file_upload(node, msg, inputs, opts) {
    const credentials = (opts && opts.credentials) || {};
    const apiKey = credentials.apiKey;
    if (!apiKey) return { ok: false, error: "Missing Mistral API key." };

    const d = inputs || {};
    const fileName = String(d.fileName || "").trim();
    const base64 = String(d.fileBase64 || "").trim();
    if (!fileName) return { ok: false, error: "fileName requis." };
    if (!base64) return { ok: false, error: "fileBase64 requis." };

    const mimeType = String(d.mimeType || "application/octet-stream").trim();
    const purpose = String(d.purpose || "ocr").trim();

    let bytes;
    try { bytes = Buffer.from(base64, "base64"); } catch { return { ok: false, error: "fileBase64 invalide." }; }

    const form = new FormData();
    form.append("purpose", purpose);
    form.append("file", new Blob([bytes], { type: mimeType }), fileName);

    const baseUrl = (credentials.baseUrl || "https://api.mistral.ai/v1").replace(/\/$/, "");
    const url = `${baseUrl}/files`;

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form
      });
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };

    return {
      ok: true,
      id: String(data?.id || ""),
      text: "uploaded",
      json: JSON.stringify(data || {})
    };
  }
};
