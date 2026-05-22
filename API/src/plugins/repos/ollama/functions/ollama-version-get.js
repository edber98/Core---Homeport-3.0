const { utils } = require("./utils");

module.exports = {
  async ollama_version_get(node, msg, inputs, opts) {
    const res = await utils.ollamaRequest(opts, "/api/version", { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      version: String(payload.version || "")
    };
  }
};
