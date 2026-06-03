const { utils } = require('./utils');
module.exports = {
  async slack_list_messages(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.channel) return { ok: false, error: 'Missing channel.' };
    const body = { channel: d.channel };
    if (d.limit) body.limit = Number(d.limit);
    if (d.latest) body.latest = d.latest;
    if (d.oldest) body.oldest = d.oldest;
    const res = await utils.slackRequest(opts, 'conversations.history', body);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const messages = (res.data.messages || []).map(m => ({ channel: d.channel, ts: m.ts || '', text: m.text || '', user: m.user || '', thread_ts: m.thread_ts || '', permalink: '' }));
    return { ok: true, messages, hasMore: !!res.data.has_more };
  }
};
