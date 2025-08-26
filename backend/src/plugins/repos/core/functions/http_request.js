exports.key = 'core_http_request';
exports.run = async (_node, _msg, inputs) => {
  const args = _node?.data?.model?.context || {};
  const method = String(args.method || 'GET').toUpperCase();
  const url = String(args.url || '');
  const headers = safeJson(args.headers, {});
  const body = safeJson(args.body, null);
  // Placeholder: do not perform real HTTP in this minimal runtime
  return { ok: true, method, url, headers, body, simulated: true };
};

function safeJson(x, def){ try { if (x == null) return def; if (typeof x === 'string') return JSON.parse(x); return x; } catch { return def; } }

