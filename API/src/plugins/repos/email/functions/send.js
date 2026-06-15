module.exports = {
  async email_send(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    try {
      let nodemailer;
      try {
        nodemailer = require("nodemailer");
      } catch (e) {
        return { ok: false, error: "Missing dependency: nodemailer" };
      }
      // Récupérer les credentials
      const { smtpHost, smtpPort, smtpSecure, username, password } =
        opts.credentials || {};

      // Normalisation : smtpPort peut arriver en string, smtpSecure en "false"
      // (string truthy → TLS implicite sur un port STARTTLS = échec TLS).
      const port = parseInt(smtpPort, 10) || 587;
      const secure = smtpSecure === true || smtpSecure === 'true' || port === 465;

      // Créer le transporteur Nodemailer
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure, // true = TLS implicite (465), false = STARTTLS (587)
        auth: {
          user: username,
          pass: password,
        },
        // Serveurs auto-hébergés (cert ≠ hostname) — même politique que l'IMAP
        tls: { rejectUnauthorized: false },
      });

      // Parser et résoudre les attachments (fileRef, JSON string, ou tableau)
      let attachments = [];
      try {
        let raw = inputs.attachments;
        if (raw && typeof raw === 'string' && raw.trim() !== '') {
          try { raw = JSON.parse(raw); } catch { /* pas du JSON, on ignore */ }
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          raw = [raw]; // un seul objet → tableau
        }
        if (Array.isArray(raw)) {
          for (const item of raw) {
            // Résoudre le champ file s'il est un string JSON (double-stringification)
            let fileRef = item.file || item;
            if (typeof fileRef === 'string') {
              try { fileRef = JSON.parse(fileRef); } catch { /* pas du JSON */ }
            }

            // Si c'est un fileRef Homeport, le résoudre via opts.files
            if (fileRef && typeof fileRef === 'object' && (fileRef._type === 'fileRef' || fileRef.fileId)) {
              if (!opts.files) {
                log('⚠ Impossible de résoudre le fichier : helper files non disponible');
                continue;
              }
              const buf = await opts.files.resolveAsBuffer(fileRef);
              attachments.push({
                filename: item.filename || fileRef.name || 'attachment',
                content: buf,
                contentType: fileRef.mimeType || 'application/octet-stream',
              });
            } else if (typeof fileRef === 'string' && /^https?:\/\//i.test(fileRef)) {
              // URL directe
              attachments.push({
                filename: item.filename || 'attachment',
                path: fileRef,
              });
            } else if (item.filename && item.content) {
              // Format nodemailer direct
              attachments.push(item);
            }
          }
        }
      } catch (err) {
        console.warn("Erreur parsing/résolution attachments:", err);
      }

      // Construire l'email
      const mailOptions = {
        from: username,
        to: inputs.to,
        cc: inputs.cc || undefined,
        bcc: inputs.bcc || undefined,
        subject: inputs.subject,
        text: inputs.text,
        html: inputs.html && inputs.html.trim() !== "" ? inputs.html : undefined,
        attachments: attachments.length ? attachments : undefined,
      };

      log(`Envoi de l'email à ${inputs.to} (sujet : "${inputs.subject}")…`);

      // Envoi du mail
      const info = await transporter.sendMail(mailOptions);

      log(`Email envoyé avec succès (messageId: ${info.messageId})`);

      return {
        ok: true,
        sent: true,
        messageId: info.messageId,
        envelope: info.envelope,
        response: info.response,
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
      };
    }
  },
};
