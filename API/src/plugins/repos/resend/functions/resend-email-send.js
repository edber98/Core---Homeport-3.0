const { utils } = require("./utils");

module.exports = {
  async resend_email_send(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const from = String(d.from || "").trim();
    const subject = String(d.subject || "").trim();
    const to = utils.parseList(d.to);
    if (!from) return { ok: false, error: "Expéditeur requis." };
    if (!to.length) return { ok: false, error: "Destinataire requis." };
    if (!subject) return { ok: false, error: "Objet requis." };
    if (!d.html && !d.text && !d.template) return { ok: false, error: "Contenu HTML, texte ou template requis." };

    const body = { from, to, subject };
    if (d.html) body.html = String(d.html);
    if (d.text) body.text = String(d.text);
    const cc = utils.parseList(d.cc);
    const bcc = utils.parseList(d.bcc);
    const replyTo = utils.parseList(d.replyTo);
    if (cc.length) body.cc = cc;
    if (bcc.length) body.bcc = bcc;
    if (replyTo.length) body.reply_to = replyTo;
    if (d.scheduledAt) body.scheduled_at = d.scheduledAt;
    if (d.messageHeaders) {
      try { body.headers = utils.parseJsonInput(d.messageHeaders, "En-têtes"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.tags) {
      try { body.tags = utils.parseJsonInput(d.tags, "Tags"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.attachments) {
      try { body.attachments = utils.parseJsonInput(d.attachments, "Pièces jointes"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.template) {
      try { body.template = utils.parseJsonInput(d.template, "Template"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Envoi de l'email Resend...");
    const res = await utils.resendRequest(opts, "/emails", { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id, success: true };
  }
};
