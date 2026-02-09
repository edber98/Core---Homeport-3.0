const { utils } = require("./utils");

module.exports = {
  async atera_kb_create(node, msg, inputs, opts) {
    const d = inputs || {};

    const body = {};
    if (d.KBProduct) body.KBProduct = d.KBProduct;
    if (d.KBContext) body.KBContext = d.KBContext;
    if (d.KBKeywords) body.KBKeywords = d.KBKeywords;
    if (d.KBIsPrivate !== undefined && d.KBIsPrivate !== "") body.KBIsPrivate = d.KBIsPrivate === "true" || d.KBIsPrivate === true;

    const res = await utils.ateraRequest(opts, "/knowledgebases", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
