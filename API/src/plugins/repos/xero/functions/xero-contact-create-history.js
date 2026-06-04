const { utils } = require('./utils');

const BODY_FIELDS = [
  {
    "key": "details",
    "type": "textarea",
    "bodyPath": [
      "Details"
    ]
  }
];


module.exports = {
  async xero_contact_create_history(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/Contacts/{contactId}/History";
    const contactid = String(d.contactid || '').trim();
    if (!contactid) return { ok: false, error: 'contactid requis.' };
    reqPath = reqPath.replace('{contactid}', encodeURIComponent(contactid));

    const query = {};
    let body;
    try {
      body = utils.buildBodyFromFields(d, BODY_FIELDS);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
