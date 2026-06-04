const { utils } = require('./utils');

module.exports = {
  async postmark_withtemplate_send_sendemailwithtemplate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/email/withTemplate";
    

    const query = {};
    if (d.pageSize !== undefined && d.pageSize !== null && d.pageSize !== '') query.page_size = d.pageSize;
    if (d.page !== undefined && d.page !== null && d.page !== '') query.page = d.page;
    if (d.search !== undefined && d.search !== null && d.search !== '') query.search = d.search;

    const body = utils.buildBodyFromInputs(d, [{"source":"From","target":"From","type":"text"},{"source":"To","target":"To","type":"textarea"},{"source":"Cc","target":"Cc","type":"textarea"},{"source":"Bcc","target":"Bcc","type":"textarea"},{"source":"Tag","target":"Tag","type":"text"},{"source":"ReplyTo","target":"ReplyTo","type":"text"},{"source":"emailHeaders","target":"Headers","type":"json"},{"source":"TrackOpens","target":"TrackOpens","type":"checkbox"},{"source":"TrackLinks","target":"TrackLinks","type":"text"},{"source":"Attachments","target":"Attachments","type":"json"},{"source":"Metadata","target":"Metadata","type":"json"},{"source":"MessageStream","target":"MessageStream","type":"text"},{"source":"TemplateId","target":"TemplateId","type":"number"},{"source":"TemplateAlias","target":"TemplateAlias","type":"text"},{"source":"TemplateModel","target":"TemplateModel","type":"json"},{"source":"InlineCss","target":"InlineCss","type":"checkbox"}]);
    if (body && body.__invalid) return { ok: false, error: body.__invalid };

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
