const { utils } = require('./utils');

module.exports = {
  async mem0_feedback_create_submit_feedback(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/v1/feedback/";
    

    const query = {};

    const headers = {};

    const body = {};
    if (d.memory_id !== undefined && d.memory_id !== null && d.memory_id !== '') {
      body["memory_id"] = d.memory_id;
    }
    if (d.feedback !== undefined && d.feedback !== null && d.feedback !== '') {
      body["feedback"] = d.feedback;
    }
    if (d.feedback_reason !== undefined && d.feedback_reason !== null && d.feedback_reason !== '') {
      body["feedback_reason"] = d.feedback_reason;
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

