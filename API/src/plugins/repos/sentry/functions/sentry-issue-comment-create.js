const { utils } = require('./utils');
module.exports = { async sentry_issue_comment_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.issueId || !d.text) return { ok: false, error: 'issueId et text requis.' };
  const res = await utils.sentryRequest(opts, `/issues/${encodeURIComponent(String(d.issueId))}/comments/`, { method: 'POST', body: { text: String(d.text) } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data || {};
  return { ok: true, id: String(r.id || ''), status: 'created', name: 'comment', url: '', text: r.text || d.text, result_json: utils.compactJson(r) };
} };
