const { utils } = require("./utils");

module.exports = {
  async teams_post_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const teamId = String(d.teamId || "").trim();
    const channelId = String(d.channelId || "").trim();
    const text = String(d.text || "").trim();
    if (!teamId || !channelId) return { ok: false, error: "L'équipe et le canal sont requis." };
    if (!text) return { ok: false, error: "Le texte est requis." };

    log("Publication du message Teams...");
    const res = await utils.graphRequest(opts, `/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: "POST",
      body: {
        body: {
          contentType: "html",
          content: text
        }
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
      text
    };
  }
};
