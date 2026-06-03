const { utils } = require('./utils');

module.exports = {
  async xero_contact_group_delete_contact(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/ContactGroups/{contactGroupId}/Contacts/{contactId}";
    const contactgroupid = String(d.contactgroupid || '').trim();
    if (!contactgroupid) return { ok: false, error: 'contactgroupid requis.' };
    reqPath = reqPath.replace('{contactgroupid}', encodeURIComponent(contactgroupid));
    const contactid = String(d.contactid || '').trim();
    if (!contactid) return { ok: false, error: 'contactid requis.' };
    reqPath = reqPath.replace('{contactid}', encodeURIComponent(contactid));

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
