const fs = require('fs');
const path = require('path');
const { utils } = require('./utils');

module.exports = {
  async attio_upload_send_upload_a_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/files/upload";

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const filePath = String(d.file_path || '').trim();
    if (!filePath) return { ok: false, error: 'file_path requis.' };
    if (!d.object) return { ok: false, error: 'object requis.' };
    if (!d.record_id) return { ok: false, error: 'record_id requis.' };
    if (!fs.existsSync(filePath)) return { ok: false, error: 'Fichier introuvable.' };

    const form = new FormData();
    const buffer = fs.readFileSync(filePath);
    form.append('file', new Blob([buffer]), path.basename(filePath));
    form.append('object', String(d.object));
    form.append('record_id', String(d.record_id));
    if (d.parent_folder_id !== undefined && d.parent_folder_id !== null && d.parent_folder_id !== '') form.append('parent_folder_id', String(d.parent_folder_id));

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, rawBody: form, headers: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
