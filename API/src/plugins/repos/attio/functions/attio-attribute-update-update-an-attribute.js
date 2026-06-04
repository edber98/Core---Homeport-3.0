const { utils } = require('./utils');

module.exports = {
  async attio_attribute_update_update_an_attribute(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/{target}/{identifier}/attributes/{attribute}";
    const target = String(d.target || '').trim();
    if (!target) return { ok: false, error: 'target requis.' };
    reqPath = reqPath.replace('{target}', encodeURIComponent(target));
    const identifier = String(d.identifier || '').trim();
    if (!identifier) return { ok: false, error: 'identifier requis.' };
    reqPath = reqPath.replace('{identifier}', encodeURIComponent(identifier));
    const attribute = String(d.attribute || '').trim();
    if (!attribute) return { ok: false, error: 'attribute requis.' };
    reqPath = reqPath.replace('{attribute}', encodeURIComponent(attribute));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.title !== undefined && d.title !== null && d.title !== '') payload.title = d.title;
    if (d.description !== undefined && d.description !== null && d.description !== '') payload.description = d.description;
    if (d.api_slug !== undefined && d.api_slug !== null && d.api_slug !== '') payload.api_slug = d.api_slug;
    if (d.is_required !== undefined && d.is_required !== null && d.is_required !== '') payload.is_required = Boolean(d.is_required);
    if (d.is_unique !== undefined && d.is_unique !== null && d.is_unique !== '') payload.is_unique = Boolean(d.is_unique);
    if (d.default_value !== undefined && d.default_value !== null && d.default_value !== '') {
      try { payload.default_value = utils.parseJsonInput(d.default_value, 'default_value', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.config !== undefined && d.config !== null && d.config !== '') {
      try { payload.config = utils.parseJsonInput(d.config, 'config', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.is_archived !== undefined && d.is_archived !== null && d.is_archived !== '') payload.is_archived = Boolean(d.is_archived);
    if (!Object.keys(payload).length) return { ok: false, error: 'Aucun champ à envoyer.' };
    const body = { data: payload };

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
