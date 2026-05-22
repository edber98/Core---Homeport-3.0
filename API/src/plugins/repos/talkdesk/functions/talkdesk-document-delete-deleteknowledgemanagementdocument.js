const { utils } = require('./utils');

module.exports = {
  async talkdesk_document_delete_deleteknowledgemanagementdocument(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/knowledge-management/external-sources/{external_source_id}/documents/{doc_id}";
    const external_source_id = String(d.external_source_id || '').trim();
    if (!external_source_id) return { ok: false, error: 'external_source_id requis.' };
    reqPath = reqPath.replace('{external_source_id}', encodeURIComponent(external_source_id));
    const doc_id = String(d.doc_id || '').trim();
    if (!doc_id) return { ok: false, error: 'doc_id requis.' };
    reqPath = reqPath.replace('{doc_id}', encodeURIComponent(doc_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

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
