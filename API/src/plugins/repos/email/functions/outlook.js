const GRAPH_API = "https://graph.microsoft.com/v1.0";

// Runtime OAuth2 managé (SSO délégué via bouncer).
let getOAuth2AccessToken = null;
try { ({ getOAuth2AccessToken } = require("../../../../oauth/oauth2-runtime")); } catch { /* optionnel */ }

async function graphRequest(opts, path, options = {}) {
  const creds = (opts && opts.credentials) || {};
  if (!getOAuth2AccessToken) return { ok: false, error: "OAuth2 runtime indisponible." };
  let accessToken;
  try {
    accessToken = await getOAuth2AccessToken({
      providerKey: String(creds.providerKey || "outlook").trim() || "outlook",
      credentials: creds,
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const url = path.startsWith("http") ? path : `${GRAPH_API}${path}`;
  const headers = { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) };
  let body;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  if (res.status === 204) return { ok: true, data: null };
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    return { ok: false, error: data?.error?.message || data?.error || `HTTP ${res.status}`, status: res.status, details: data };
  }
  return { ok: true, data };
}

// "a@b.com, c@d.com" ou tableau → [{ emailAddress: { address } }]
function toRecipients(value) {
  let list = value;
  if (typeof list === "string") {
    try { const p = JSON.parse(list); if (Array.isArray(p)) list = p; } catch { /* csv */ }
  }
  if (typeof list === "string") list = list.split(/[,;]/);
  if (!Array.isArray(list)) list = list ? [list] : [];
  return list
    .map((r) => (typeof r === "string" ? r : r?.email || r?.address))
    .map((a) => String(a || "").trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

function mapMessage(m = {}) {
  return {
    id: m.id || "",
    subject: m.subject || "",
    from: m.from?.emailAddress?.address || "",
    fromName: m.from?.emailAddress?.name || "",
    to: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
    receivedAt: m.receivedDateTime || "",
    preview: m.bodyPreview || "",
    isRead: !!m.isRead,
    webLink: m.webLink || "",
  };
}

module.exports = {
  // Envoie un e-mail via Outlook (Microsoft Graph /me/sendMail).
  async outlook_send_email(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const to = toRecipients(d.to);
    if (!to.length) return { ok: false, error: "Destinataire manquant." };

    const message = {
      subject: String(d.subject || ""),
      body: {
        contentType: d.html ? "HTML" : "Text",
        content: String(d.html || d.text || ""),
      },
      toRecipients: to,
    };
    const cc = toRecipients(d.cc);
    if (cc.length) message.ccRecipients = cc;
    const bcc = toRecipients(d.bcc);
    if (bcc.length) message.bccRecipients = bcc;

    // Pièces jointes (fileRef Homeport → base64).
    if (opts && opts.files && d.attachments) {
      let raw = d.attachments;
      if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = []; } }
      if (raw && !Array.isArray(raw)) raw = [raw];
      const atts = [];
      for (const item of (raw || [])) {
        let fileRef = item?.file || item;
        if (typeof fileRef === "string") { try { fileRef = JSON.parse(fileRef); } catch { /* */ } }
        if (fileRef && typeof fileRef === "object" && (fileRef._type === "fileRef" || fileRef.fileId)) {
          try {
            const buf = await opts.files.resolveAsBuffer(fileRef);
            atts.push({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: item?.filename || fileRef.name || "attachment",
              contentType: fileRef.mimeType || "application/octet-stream",
              contentBytes: Buffer.from(buf).toString("base64"),
            });
          } catch (e) { log(`⚠ Pièce jointe ignorée: ${e.message}`); }
        }
      }
      if (atts.length) message.attachments = atts;
    }

    log("Envoi de l’e-mail Outlook...");
    const res = await graphRequest(opts, "/me/sendMail", {
      method: "POST",
      body: { message, saveToSentItems: d.saveToSentItems !== false },
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, sent: true, to: to.map((r) => r.emailAddress.address) };
  },

  // Liste les messages de la boîte de réception (Graph /me/messages).
  async outlook_list_messages(node, msg, inputs, opts) {
    const d = inputs || {};
    const params = new URLSearchParams();
    params.set("$top", String(Math.min(Number(d.limit || 25) || 25, 100)));
    params.set("$select", "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,webLink");
    params.set("$orderby", "receivedDateTime desc");
    if (d.search) params.set("$search", `"${String(d.search)}"`);
    else if (d.filter) params.set("$filter", String(d.filter));

    const res = await graphRequest(opts, `/me/messages?${params.toString()}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data?.value || []).map(mapMessage);
    return { ok: true, count: items.length, messages: items };
  },

  // Récupère un message complet (Graph /me/messages/{id}).
  async outlook_get_message(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.messageId) return { ok: false, error: "ID de message manquant." };
    const res = await graphRequest(opts, `/me/messages/${encodeURIComponent(d.messageId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const m = res.data || {};
    return { ok: true, ...mapMessage(m), body: m.body?.content || "", bodyType: m.body?.contentType || "" };
  },
};
