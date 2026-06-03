const { utils } = require('./utils');

module.exports = {
  async revolut_business_card_invitation_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/card-invitations/{cardInvitationId}/cancel";
    const cardinvitationid = String(d.cardinvitationid || '').trim();
    if (!cardinvitationid) return { ok: false, error: 'cardinvitationid requis.' };
    reqPath = reqPath.replace('{cardinvitationid}', encodeURIComponent(cardinvitationid));

    const query = {};
    

    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else {
        try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; }
      }
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
