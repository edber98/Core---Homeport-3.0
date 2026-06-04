const { utils } = require('./utils');

module.exports = {
  async front_note_create_add_note(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/contacts/{contact_id}/notes";
    const contact_id = String(d.contact_id || '').trim();
    if (!contact_id) return { ok: false, error: 'contact_id requis.' };
    reqPath = reqPath.replace('{contact_id}', encodeURIComponent(contact_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.author_id !== undefined && d.author_id !== null && d.author_id !== '') {
      body["author_id"] = d.author_id;
    }
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      body["body"] = d.body;
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


