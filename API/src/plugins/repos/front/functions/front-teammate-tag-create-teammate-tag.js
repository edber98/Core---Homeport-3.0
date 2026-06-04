const { utils } = require('./utils');

module.exports = {
  async front_teammate_tag_create_teammate_tag(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/teammates/{teammate_id}/tags";
    const teammate_id = String(d.teammate_id || '').trim();
    if (!teammate_id) return { ok: false, error: 'teammate_id requis.' };
    reqPath = reqPath.replace('{teammate_id}', encodeURIComponent(teammate_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== '') {
      body["name"] = d.name;
    }
    if (d.description !== undefined && d.description !== null && d.description !== '') {
      body["description"] = d.description;
    }
    if (d.highlight !== undefined && d.highlight !== null && d.highlight !== '') {
      body["highlight"] = d.highlight;
    }
    if (d.is_visible_in_conversation_lists !== undefined && d.is_visible_in_conversation_lists !== null && d.is_visible_in_conversation_lists !== '') {
      body["is_visible_in_conversation_lists"] = d.is_visible_in_conversation_lists;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'POST', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};

