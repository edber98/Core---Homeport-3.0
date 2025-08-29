const nodemailer = require("nodemailer");

module.exports = {
  async email_send(node, msg, inputs, opts) {
    try {
      // Récupérer les credentials
      const { smtpHost, smtpPort, smtpSecure, username, password } =
        opts.credentials || {};

      // Créer le transporteur Nodemailer
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true = 465, false = 587
        auth: {
          user: username,
          pass: password,
        },
      });

      // Parser les attachments (si fournis en JSON string)
      let attachments = [];
      try {
        if (inputs.attachments && inputs.attachments.trim() !== "") {
          attachments = JSON.parse(inputs.attachments);
        }
      } catch (err) {
        console.warn("Erreur parsing attachments:", err);
      }

      // Construire l’email
      const mailOptions = {
        from: inputs.from || username,
        to: inputs.to,
        cc: inputs.cc || undefined,
        bcc: inputs.bcc || undefined,
        subject: inputs.subject,
        text: inputs.text,
        html: inputs.html && inputs.html.trim() !== "" ? inputs.html : undefined,
        attachments: attachments,
      };

      // Envoi du mail
      const info = await transporter.sendMail(mailOptions);

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