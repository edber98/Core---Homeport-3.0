const { utils } = require("./utils");

module.exports = {
  async wp_media_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    const fileUrl = (d.fileUrl || "").trim();
    if (!fileUrl) return { ok: false, error: "Missing fileUrl." };

    let fileRes;
    try { fileRes = await fetch(fileUrl); } catch (e) { return { ok: false, error: "Failed to fetch file: " + e.message }; }
    if (!fileRes.ok) return { ok: false, error: `Failed to fetch file: HTTP ${fileRes.status}` };

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
    const filename = fileUrl.split("/").pop().split("?")[0] || "file";

    const credentials = (opts && opts.credentials) || {};
    const siteUrl = (credentials.siteUrl || "").replace(/\/+$/, "");
    const auth = Buffer.from(`${credentials.username}:${credentials.applicationPassword}`).toString("base64");

    const url = `${siteUrl}/wp-json/wp/v2/media`;
    const headers = { "Authorization": `Basic ${auth}`, "Content-Type": contentType, "Content-Disposition": `attachment; filename="${filename}"` };

    let res;
    try { res = await fetch(url, { method: "POST", headers, body: buffer }); } catch (e) { return { ok: false, error: e.message }; }

    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, status: res.status, details: data };

    const r = data || {};
    if (d.title || d.alt_text) {
      const updateBody = {};
      if (d.title) updateBody.title = d.title;
      if (d.alt_text) updateBody.alt_text = d.alt_text;
      await utils.wpRequest(opts, `/media/${r.id}`, { method: "POST", body: updateBody });
    }

    return { ok: true, id: String(r.id), title: r.title?.rendered || "", source_url: r.source_url || "", media_type: r.media_type || "", mime_type: r.mime_type || "", date: r.date, alt_text: r.alt_text || "" };
  }
};
