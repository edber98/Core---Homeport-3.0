const { utils } = require('./utils');

module.exports = {
  async hunter_sequence_remove_sequence_recipient(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.id || '').trim();
    const recipientId = String(d.recipientId || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    if (!recipientId) return { ok: false, error: 'recipientId requis.' };

    const reqPath = `/v2/campaigns/${encodeURIComponent(id)}/recipients/${encodeURIComponent(recipientId)}`;
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status || 200, message: 'Destinataire supprimé de la séquence.', raw: res.data || null };
  }
};
