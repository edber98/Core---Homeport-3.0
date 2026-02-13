const { utils } = require("./utils");

module.exports = {
  async googlechat_card_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.title) return { ok: false, error: "Missing title." };

    const widgets = [];
    if (d.text) widgets.push({ textParagraph: { text: d.text } });
    if (d.buttonText && d.buttonUrl) {
      widgets.push({ buttons: [{ textButton: { text: d.buttonText, onClick: { openLink: { url: d.buttonUrl } } } }] });
    }

    const card = {
      cards: [{
        header: {
          title: d.title,
          ...(d.subtitle ? { subtitle: d.subtitle } : {}),
          ...(d.imageUrl ? { imageUrl: d.imageUrl, imageStyle: "IMAGE" } : {})
        },
        sections: [{ widgets }]
      }]
    };

    log('Envoi du prompt...');
    const res = await utils.chatWebhookRequest(opts, card);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "sent", message: "Card sent successfully." };
  }
};
