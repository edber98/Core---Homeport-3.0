const { utils } = require("./utils");

module.exports = {
  async teams_adaptive_card(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const teamId = String(d.teamId || "").trim();
    const channelId = String(d.channelId || "").trim();
    const card = utils.parseJson(d.card, {});
    if (!teamId || !channelId) return { ok: false, error: "L'équipe et le canal sont requis." };

    log("Envoi de la carte adaptative Teams...");
    const res = await utils.graphRequest(opts, `/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: "POST",
      body: {
        body: {
          contentType: "html",
          content: "Carte adaptative"
        },
        attachments: [
          {
            id: "adaptive-card",
            contentType: "application/vnd.microsoft.card.adaptive",
            content: JSON.stringify(card)
          }
        ]
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const data = res.data || {};
    return {
      ok: true,
      id: data.id || "",
      teamId,
      channelId,
      webUrl: data.webUrl || "",
      text: "Carte adaptative"
    };
  }
};
