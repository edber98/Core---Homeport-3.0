const { utils } = require("./utils");

module.exports = {
  async asana_story_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const taskGid = (d.taskGid || "").trim();
    const text = (d.text || "").trim();
    if (!taskGid) return { ok: false, error: "Missing taskGid." };
    if (!text) return { ok: false, error: "Missing text." };

    log('Création en cours...');
    const res = await utils.asanaRequest(opts, `/tasks/${encodeURIComponent(taskGid)}/stories`, {
      method: "POST", body: { data: { text } }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.data) || {};
    return {
      ok: true, gid: r.gid || "", text: r.text || "", type: r.type || "",
      created_by: r.created_by ? r.created_by.name : "", created_at: r.created_at || ""
    };
  }
};
