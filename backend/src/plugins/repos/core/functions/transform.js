exports.key = 'core_transform';
exports.run = async (_node, _msg, inputs) => {
  const ctx = _node?.data?.model?.context || {};
  const mappings = parseJson(ctx.mappings, {});
  const src = (inputs && typeof inputs === 'object') ? inputs : {};
  const out = {};
  // Simple mapping: { dst: srcPath }
  for (const [dst, srcKey] of Object.entries(mappings)) {
    out[dst] = srcKey ? getPath(src, String(srcKey)) : undefined;
  }
  return out;
};

function parseJson(s, d){ try { if (!s) return d; return typeof s === 'string' ? JSON.parse(s) : s; } catch { return d; } }
function getPath(obj, p){ try { return p.split('.').reduce((a,k)=> (a? a[k]: undefined), obj); } catch { return undefined; } }

