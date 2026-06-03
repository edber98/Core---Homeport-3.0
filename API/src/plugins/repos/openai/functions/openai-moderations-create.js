const { utils } = require("./utils");

module.exports = {
  async openai_moderations_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const input = String(d.input || "").trim();
    if (!input) return { ok: false, error: "Le champ input est requis." };

    const body = { input, model: String(d.model || "omni-moderation-latest") };
    const res = await utils.openaiRequest(opts, "/moderations", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const first = (res.data?.results || [])[0] || {};
    return {
      ok: true,
      id: String(res.data?.id || ""),
      text: JSON.stringify({
        flagged: !!first.flagged,
        categories: first.categories || {},
        category_scores: first.category_scores || {}
      }),
      json: JSON.stringify(res.data || {})
    };
  }
};
