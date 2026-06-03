const { utils } = require('./utils');

module.exports = {
  async attio_file_create_create_a_folder(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/files";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.object !== undefined && d.object !== null && d.object !== '') payload.object = d.object;
    if (d.record_id !== undefined && d.record_id !== null && d.record_id !== '') payload.record_id = d.record_id;
    if (d.file_type !== undefined && d.file_type !== null && d.file_type !== '') payload.file_type = d.file_type;
    if (d.name !== undefined && d.name !== null && d.name !== '') payload.name = d.name;
    if (d.parent_folder_id !== undefined && d.parent_folder_id !== null && d.parent_folder_id !== '') payload.parent_folder_id = d.parent_folder_id;
    if (d.storage_provider !== undefined && d.storage_provider !== null && d.storage_provider !== '') payload.storage_provider = d.storage_provider;
    if (d.external_provider_file_id !== undefined && d.external_provider_file_id !== null && d.external_provider_file_id !== '') payload.external_provider_file_id = d.external_provider_file_id;
    if (d.microsoft_drive_id !== undefined && d.microsoft_drive_id !== null && d.microsoft_drive_id !== '') payload.microsoft_drive_id = d.microsoft_drive_id;
    if (payload.object === undefined) return { ok: false, error: 'object requis.' };
    if (payload.record_id === undefined) return { ok: false, error: 'record_id requis.' };
    if (payload.file_type === undefined) return { ok: false, error: 'file_type requis.' };
    if (payload.file_type === 'folder' && !payload.name) return { ok: false, error: 'name requis pour un dossier natif.' };
    if ((payload.file_type === 'connected-folder' || payload.file_type === 'connected-file') && (!payload.storage_provider || !payload.external_provider_file_id)) return { ok: false, error: 'storage_provider et external_provider_file_id requis pour un fichier connecté.' };
    const body = payload;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};
