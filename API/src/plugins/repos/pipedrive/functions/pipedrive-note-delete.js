const { utils } = require('./utils');

module.exports = {
  async pipedrive_note_delete(node, msg, inputs, opts) {
    const id = String(inputs?.noteId || '').trim();
    if (!id) return { ok: false, error: 'Missing noteId.' };

    const res = await utils.pdRequest(opts, `/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: Number(id), status: 'deleted', message: 'Note supprimée.' };
  }
};
