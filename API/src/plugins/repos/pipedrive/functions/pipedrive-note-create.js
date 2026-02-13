const { utils } = require("./utils");

module.exports = {
  async pipedrive_note_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const content = (d.content || "").trim();
    if (!content) return { ok: false, error: "Missing content." };

    const body = { content };
    if (d.deal_id) body.deal_id = parseInt(d.deal_id, 10);
    if (d.person_id) body.person_id = parseInt(d.person_id, 10);
    if (d.org_id) body.org_id = parseInt(d.org_id, 10);

    log('Création en cours...');
    const res = await utils.pdRequest(opts, "/notes", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, content: r.content, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time };
  }
};
