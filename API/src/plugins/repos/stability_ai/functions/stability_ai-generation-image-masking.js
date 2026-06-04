const { utils } = require('./utils');

module.exports = {
  async stability_ai_generation_image_masking(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/generation/{engine_id}/image-to-image/masking";
    const engine_id = String(d.engine_id || '').trim();
    if (!engine_id) return { ok: false, error: 'engine_id requis.' };
    reqPath = reqPath.replace('{engine_id}', encodeURIComponent(engine_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    let body;
    try {
      body = utils.bodyFromFields(d, ['init_image', 'mask_image', 'mask_source', 'text_prompts', 'cfg_scale', 'clip_guidance_preset', 'samples', 'sampler', 'seed', 'steps', 'style_preset', 'extras'], ['text_prompts', 'extras']);
    } catch (e) {
      return { ok: false, error: e.message };
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
