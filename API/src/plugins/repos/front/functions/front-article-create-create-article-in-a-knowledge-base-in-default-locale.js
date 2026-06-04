const { utils } = require('./utils');

module.exports = {
  async front_article_create_create_article_in_a_knowledge_base_in_default_locale(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/knowledge_bases/{knowledge_base_id}/articles";
    const knowledge_base_id = String(d.knowledge_base_id || '').trim();
    if (!knowledge_base_id) return { ok: false, error: 'knowledge_base_id requis.' };
    reqPath = reqPath.replace('{knowledge_base_id}', encodeURIComponent(knowledge_base_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.category_id !== undefined && d.category_id !== null && d.category_id !== '') {
      body["category_id"] = d.category_id;
    }
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

