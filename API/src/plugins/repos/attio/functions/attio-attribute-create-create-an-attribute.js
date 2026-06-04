const { utils } = require('./utils');

module.exports = {
  async attio_attribute_create_create_an_attribute(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v2/{target}/{identifier}/attributes";
    const target = String(d.target || '').trim();
    if (!target) return { ok: false, error: 'target requis.' };
    reqPath = reqPath.replace('{target}', encodeURIComponent(target));
    const identifier = String(d.identifier || '').trim();
    if (!identifier) return { ok: false, error: 'identifier requis.' };
    reqPath = reqPath.replace('{identifier}', encodeURIComponent(identifier));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;
    const payload = {};
    if (d.title !== undefined && d.title !== null && d.title !== '') payload.title = d.title;
    if (d.description !== undefined && d.description !== null && d.description !== '') payload.description = d.description;
    if (d.api_slug !== undefined && d.api_slug !== null && d.api_slug !== '') payload.api_slug = d.api_slug;
    if (d.type !== undefined && d.type !== null && d.type !== '') payload.type = d.type;
    if (d.is_required !== undefined && d.is_required !== null && d.is_required !== '') payload.is_required = Boolean(d.is_required);
    if (d.is_unique !== undefined && d.is_unique !== null && d.is_unique !== '') payload.is_unique = Boolean(d.is_unique);
    if (d.is_multiselect !== undefined && d.is_multiselect !== null && d.is_multiselect !== '') payload.is_multiselect = Boolean(d.is_multiselect);
    if (d.default_value !== undefined && d.default_value !== null && d.default_value !== '') {
      try { payload.default_value = utils.parseJsonInput(d.default_value, 'default_value', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.relationship !== undefined && d.relationship !== null && d.relationship !== '') {
      try { payload.relationship = utils.parseJsonInput(d.relationship, 'relationship', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.config !== undefined && d.config !== null && d.config !== '') {
      try { payload.config = utils.parseJsonInput(d.config, 'config', undefined); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (payload.title === undefined) return { ok: false, error: 'title requis.' };
    if (payload.description === undefined) return { ok: false, error: 'description requis.' };
    if (payload.api_slug === undefined) return { ok: false, error: 'api_slug requis.' };
    if (payload.type === undefined) return { ok: false, error: 'type requis.' };
    if (payload.is_required === undefined) return { ok: false, error: 'is_required requis.' };
    if (payload.is_unique === undefined) return { ok: false, error: 'is_unique requis.' };
    if (payload.is_multiselect === undefined) return { ok: false, error: 'is_multiselect requis.' };
    if (payload.config === undefined) return { ok: false, error: 'config requis.' };
    const body = { data: payload };

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
