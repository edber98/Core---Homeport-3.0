const { utils } = require('./utils');

module.exports = {
  async jenkins_queue_items_list(node, msg, inputs, opts) {
    const d = inputs || {};

    const res = await utils.jenkinsRequest(opts, '/queue/api/json', {
      method: 'GET',
      query: {
        tree: String(d.tree || 'items[id,url,why,blocked,stuck,task[name,url],executable[number,url],cancelled]')
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = Array.isArray(res.data && res.data.items) ? res.data.items : [];
    return {
      ok: true,
      items: items.map(utils.mapQueueItem),
      totalCount: items.length,
      raw: res.data || {}
    };
  }
};
