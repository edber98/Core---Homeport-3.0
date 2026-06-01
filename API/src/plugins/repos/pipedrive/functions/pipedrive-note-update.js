const { utils } = require('./utils');

module.exports = {
  async pipedrive_note_update(node, msg, inputs, opts) {
    const id = String(inputs?.noteId || '').trim();
    const content = String(inputs?.content || '').trim();
    if (!id) return { ok: false, error: 'Missing noteId.' };
    if (!content) return { ok: false, error: 'Missing content.' };

    const res = await utils.pdRequest(opts, `/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: { content } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, content: r.content, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time };
  }
};
