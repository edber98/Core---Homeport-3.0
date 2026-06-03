const { utils } = require('./utils');

module.exports = {
  async front_download_comment_download_attachment_for_a_comment(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/comments/{comment_id}/download/{attachment_link_id}";
    const comment_id = String(d.comment_id || '').trim();
    if (!comment_id) return { ok: false, error: 'comment_id requis.' };
    reqPath = reqPath.replace('{comment_id}', encodeURIComponent(comment_id));
    const attachment_link_id = String(d.attachment_link_id || '').trim();
    if (!attachment_link_id) return { ok: false, error: 'attachment_link_id requis.' };
    reqPath = reqPath.replace('{attachment_link_id}', encodeURIComponent(attachment_link_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'GET', query, body });
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
