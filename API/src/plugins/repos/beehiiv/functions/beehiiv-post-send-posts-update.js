const { utils } = require('./utils');

module.exports = {
  async beehiiv_post_send_posts_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/publications/{publicationId}/posts/{postId}";
    const publicationid = String(d.publicationid || '').trim();
    if (!publicationid) return { ok: false, error: 'publicationid requis.' };
    reqPath = reqPath.replace('{publicationid}', encodeURIComponent(publicationid));
    const postid = String(d.postid || '').trim();
    if (!postid) return { ok: false, error: 'postid requis.' };
    reqPath = reqPath.replace('{postid}', encodeURIComponent(postid));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const builtBody = utils.buildRequestBody(d, [{"key": "blocks", "bodyKey": "blocks", "type": "array"}, {"key": "body_content", "bodyKey": "body_content", "type": "string"}, {"key": "title", "bodyKey": "title", "type": "string"}, {"key": "subtitle", "bodyKey": "subtitle", "type": "string"}, {"key": "scheduled_at", "bodyKey": "scheduled_at", "type": "string"}, {"key": "custom_link_tracking_enabled", "bodyKey": "custom_link_tracking_enabled", "type": "boolean"}, {"key": "email_capture_type_override", "bodyKey": "email_capture_type_override", "type": "string"}, {"key": "override_scheduled_at", "bodyKey": "override_scheduled_at", "type": "string"}, {"key": "social_share", "bodyKey": "social_share", "type": "string"}, {"key": "thumbnail_image_url", "bodyKey": "thumbnail_image_url", "type": "string"}, {"key": "email_settings", "bodyKey": "email_settings", "type": "object"}, {"key": "web_settings", "bodyKey": "web_settings", "type": "object"}, {"key": "seo_settings", "bodyKey": "seo_settings", "type": "object"}, {"key": "content_tags", "bodyKey": "content_tags", "type": "array"}]);
    if (!builtBody.ok) return builtBody;
    const body = builtBody.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
