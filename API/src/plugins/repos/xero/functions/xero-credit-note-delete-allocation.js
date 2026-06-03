const { utils } = require('./utils');

module.exports = {
  async xero_credit_note_delete_allocation(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/CreditNotes/{creditNoteId}/Allocations/{allocationId}";
    const creditnoteid = String(d.creditnoteid || '').trim();
    if (!creditnoteid) return { ok: false, error: 'creditnoteid requis.' };
    reqPath = reqPath.replace('{creditnoteid}', encodeURIComponent(creditnoteid));
    const allocationid = String(d.allocationid || '').trim();
    if (!allocationid) return { ok: false, error: 'allocationid requis.' };
    reqPath = reqPath.replace('{allocationid}', encodeURIComponent(allocationid));

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
