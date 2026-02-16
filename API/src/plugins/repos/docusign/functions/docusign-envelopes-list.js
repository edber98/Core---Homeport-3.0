const { utils } = require("./utils");

module.exports = {
  async docusign_envelopes_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.fromDate) query.from_date = d.fromDate;
    else query.from_date = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    if (d.toDate) query.to_date = d.toDate;
    if (d.status) query.status = d.status;
    if (d.count) query.count = d.count;

    log('Récupération de la liste...');
    const res = await utils.docusignRequest(opts, "/envelopes", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.envelopes) || [];
    const envelopes = items.map(r => ({ envelopeId: r.envelopeId, status: r.status, emailSubject: r.emailSubject, senderName: r.sender?.userName || "", sentDateTime: r.sentDateTime || "", createdDateTime: r.createdDateTime || "" }));
    return { ok: true, envelopes , totalCount: envelopes.length };
  }
};
