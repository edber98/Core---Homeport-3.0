const { utils } = require('./utils');

module.exports = {
  async customer_io_language_tag_createnewsletterlanguagevariant(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/newsletters/{newsletter_id}/language";
    const newsletter_id = String(d.newsletter_id || '').trim();
    if (!newsletter_id) return { ok: false, error: 'newsletter_id requis.' };
    reqPath = reqPath.replace('{newsletter_id}', encodeURIComponent(newsletter_id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"language","target":"language","type":"string"},{"key":"subject","target":"subject","type":"string"},{"key":"preheaderText","target":"preheader_text","type":"string"},{"key":"messageBody","target":"body","type":"string"},{"key":"bodyPlain","target":"body_plain","type":"string"},{"key":"bodyAmp","target":"body_amp","type":"string"},{"key":"bodyJson","target":"body_json","type":"string"}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

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
