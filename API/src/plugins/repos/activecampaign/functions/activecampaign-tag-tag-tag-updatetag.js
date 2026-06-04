const { utils } = require('./utils');

module.exports = {
  async activecampaign_tag_tag_tag_updatetag(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/tags/{id}";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = {};
    if (d.tag_tag !== undefined && d.tag_tag !== null && d.tag_tag !== "") {
          if (!body["tag"] || typeof body["tag"] !== 'object' || Array.isArray(body["tag"])) body["tag"] = {};
          body["tag"]["tag"] = d.tag_tag;
        }
    if (d.tag_tagtype !== undefined && d.tag_tagtype !== null && d.tag_tagtype !== "") {
          if (!body["tag"] || typeof body["tag"] !== 'object' || Array.isArray(body["tag"])) body["tag"] = {};
          body["tag"]["tagtype"] = d.tag_tagtype;
        }
    if (d.tag_description !== undefined && d.tag_description !== null && d.tag_description !== "") {
          if (!body["tag"] || typeof body["tag"] !== 'object' || Array.isArray(body["tag"])) body["tag"] = {};
          body["tag"]["description"] = d.tag_description;
        }
    const requestBody = Object.keys(body).length ? body : undefined;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body: requestBody });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
