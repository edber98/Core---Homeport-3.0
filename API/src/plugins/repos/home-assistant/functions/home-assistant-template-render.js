const { utils } = require("./utils");

module.exports = {
  async home_assistant_template_render(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const template = String(d.template || "");
    if (!template.trim()) return { ok: false, error: "Template requis." };
    log("Rendu du template...");
    const res = await utils.homeAssistantRequest(opts, "/api/template", { method: "POST", body: { template } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, result: typeof res.data === "string" ? res.data : JSON.stringify(res.data) };
  }
};
