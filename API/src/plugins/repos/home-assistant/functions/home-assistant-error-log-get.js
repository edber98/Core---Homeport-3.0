const { utils } = require("./utils");

module.exports = {
  async home_assistant_error_log_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = utils.toPositiveInt(d.pageSize, 200, 2000);
    log("Lecture du journal d'erreurs...");
    const res = await utils.homeAssistantRequest(opts, "/api/error_log");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data || "");
    const lines = text.split(/\r?\n/).filter(Boolean).slice(-limit).map((value) => ({ value }));
    return { ok: true, log: lines.map((line) => line.value).join("\n"), lines, lineCount: lines.length };
  }
};
