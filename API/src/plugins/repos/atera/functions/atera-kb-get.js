const { utils } = require("./utils");

module.exports = {
  async atera_kb_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.kbId) return { ok: false, error: "Missing kbId." };

    const res = await utils.ateraRequest(opts, `/knowledgebases/${encodeURIComponent(d.kbId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
