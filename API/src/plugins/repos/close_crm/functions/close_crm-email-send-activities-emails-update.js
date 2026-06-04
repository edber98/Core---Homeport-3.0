const { utils } = require('./utils');

module.exports = {
  async close_crm_email_send_activities_emails_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/activity/email/{id}/";
    const id = String(d.id || '').trim();
    if (!id) return { ok: false, error: 'id requis.' };
    reqPath = reqPath.replace('{id}', encodeURIComponent(id));

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const bodyResult = utils.buildRequestBody(d, [{"key":"activity_at","target":"activity_at","type":["null","string"]},{"key":"attachments","target":"attachments","type":["array","null"]},{"key":"bcc","target":"bcc","type":["array","null"]},{"key":"body_html","target":"body_html","type":["null","string"]},{"key":"body_text","target":"body_text","type":["null","string"]},{"key":"cc","target":"cc","type":["array","null"]},{"key":"contact_id","target":"contact_id","type":["null","string"]},{"key":"email_account_id","target":"email_account_id","type":["null","string"]},{"key":"followup_date","target":"followup_date","type":["null","string"]},{"key":"followup_sequence_add_cc_bcc","target":"followup_sequence_add_cc_bcc","type":["boolean","null"]},{"key":"followup_sequence_delay","target":"followup_sequence_delay","type":["integer","null"]},{"key":"followup_sequence_id","target":"followup_sequence_id","type":["null","string"]},{"key":"in_reply_to_id","target":"in_reply_to_id","type":["null","string"]},{"key":"opens","target":"opens","type":["array","null"]},{"key":"sender","target":"sender","type":["null","string"]},{"key":"status","target":"status","type":"string"},{"key":"subject","target":"subject","type":["null","string"]},{"key":"template_id","target":"template_id","type":["null","string"]},{"key":"to","target":"to","type":["array","null"]},{"key":"user_id","target":"user_id","type":["null","string"]}]);
    if (!bodyResult.ok) return bodyResult;
    const body = bodyResult.body;

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PUT', query, body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Action exécutée.',
      raw: res.data || null
    };
  }
};
