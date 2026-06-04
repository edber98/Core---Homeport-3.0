const { utils } = require('./utils');

module.exports = {
  async front_content_update_update_article_content_in_specified_locale(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/knowledge_base_articles/{article_id}/locales/{locale}/content";
    const article_id = String(d.article_id || '').trim();
    if (!article_id) return { ok: false, error: 'article_id requis.' };
    reqPath = reqPath.replace('{article_id}', encodeURIComponent(article_id));
    const locale = String(d.locale || '').trim();
    if (!locale) return { ok: false, error: 'locale requis.' };
    reqPath = reqPath.replace('{locale}', encodeURIComponent(locale));

    const query = {};

    const headers = {};

    const body = {};
    if (d.author_id !== undefined && d.author_id !== null && d.author_id !== '') {
      body["author_id"] = d.author_id;
    }
    if (d.subject !== undefined && d.subject !== null && d.subject !== '') {
      body["subject"] = d.subject;
    }
    if (d.content !== undefined && d.content !== null && d.content !== '') {
      body["content"] = d.content;
    }
    if (d.status !== undefined && d.status !== null && d.status !== '') {
      body["status"] = d.status;
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

