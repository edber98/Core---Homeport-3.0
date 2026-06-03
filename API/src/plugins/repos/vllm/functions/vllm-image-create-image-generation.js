const { utils } = require('./utils');
module.exports = {
  async vllm_image_create_image_generation(node, msg, inputs, opts) {
    const d = inputs || {};
    let body = undefined;
    if (d.body !== undefined && d.body !== null && d.body !== '') {
      if (typeof d.body === 'object') body = d.body;
      else { try { body = JSON.parse(String(d.body)); } catch { return { ok: false, error: 'JSON invalide dans body.' }; } }
    }
    const res = await utils.providerRequest(opts, '/v1/images/generations', { method: 'POST', body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.created || '', status: 'generated', raw: r };
  }
};
