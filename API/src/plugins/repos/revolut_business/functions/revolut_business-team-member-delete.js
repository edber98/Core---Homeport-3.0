const { utils } = require('./utils');

module.exports = {
  async revolut_business_team_member_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/team-members/{teamMemberId}";
    const teammemberid = String(d.teammemberid || '').trim();
    if (!teammemberid) return { ok: false, error: 'teammemberid requis.' };
    reqPath = reqPath.replace('{teammemberid}', encodeURIComponent(teammemberid));

    const query = {};
    

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'DELETE', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
