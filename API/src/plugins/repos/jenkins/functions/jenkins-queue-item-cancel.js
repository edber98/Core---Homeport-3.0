const { utils } = require('./utils');

module.exports = {
  async jenkins_queue_item_cancel(node, msg, inputs, opts) {
    const d = inputs || {};
    const queueId = String(d.queueId || '').trim();
    if (!queueId) return { ok: false, error: 'queueId requis.' };

    const res = await utils.jenkinsRequest(opts, '/queue/cancelItem', {
      method: 'POST',
      query: { id: queueId },
      withCrumb: true,
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Élément de queue annulé.',
      queue_id: Number(queueId)
    };
  }
};
