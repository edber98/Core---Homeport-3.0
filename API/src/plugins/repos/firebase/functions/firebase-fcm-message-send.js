const { utils } = require("./utils");

module.exports = {
  async firebase_fcm_message_send(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};
    const projectId = String(d.projectId || credentials.projectId || "").trim();
    if (!projectId) return { ok: false, error: "ID de projet Firebase requis." };

    const targetType = String(d.targetType || "token").trim();
    const target = String(d.target || "").trim();
    if (!target) return { ok: false, error: "Cible du message requise." };

    const message = {};
    message[targetType === "topic" ? "topic" : targetType === "condition" ? "condition" : "token"] = target;
    if (d.title || d.body) message.notification = { title: d.title || "", body: d.body || "" };
    if (d.customData) {
      try {
        const parsedData = utils.parseJsonInput(d.customData, "Données personnalisées");
        message.data = Object.fromEntries(Object.entries(parsedData || {}).map(([key, value]) => [key, String(value)]));
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }
    if (d.android) {
      try { message.android = utils.parseJsonInput(d.android, "Android"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.apns) {
      try { message.apns = utils.parseJsonInput(d.apns, "APNs"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.webpush) {
      try { message.webpush = utils.parseJsonInput(d.webpush, "Webpush"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Envoi du message FCM...");
    const res = await utils.firebaseRequest(opts, `${utils.FCM_API}/projects/${encodeURIComponent(projectId)}/messages:send`, {
      body: { message, validate_only: utils.parseBoolean(d.validateOnly) },
      method: "POST"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, name: res.data?.name || "", success: true };
  }
};
