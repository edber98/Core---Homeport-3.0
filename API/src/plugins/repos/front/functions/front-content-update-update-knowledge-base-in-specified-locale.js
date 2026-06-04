const { utils } = require('./utils');

module.exports = {
  async front_content_update_update_knowledge_base_in_specified_locale(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/knowledge_bases/{knowledge_base_id}/locales/{locale}/content";
    const knowledge_base_id = String(d.knowledge_base_id || '').trim();
    if (!knowledge_base_id) return { ok: false, error: 'knowledge_base_id requis.' };
    reqPath = reqPath.replace('{knowledge_base_id}', encodeURIComponent(knowledge_base_id));
    const locale = String(d.locale || '').trim();
    if (!locale) return { ok: false, error: 'locale requis.' };
    reqPath = reqPath.replace('{locale}', encodeURIComponent(locale));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
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

