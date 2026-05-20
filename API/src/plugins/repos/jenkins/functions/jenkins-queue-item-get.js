const { utils } = require('./utils');

module.exports = {
  async jenkins_queue_item_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const queueId = String(d.queueId || '').trim();
    if (!queueId) return { ok: false, error: 'queueId requis.' };

    const res = await utils.jenkinsRequest(opts, `/queue/item/${encodeURIComponent(queueId)}/api/json`, {
      method: 'GET'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapQueueItem(res.data) };
  }
};
