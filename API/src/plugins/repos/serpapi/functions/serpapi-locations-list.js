const { utils } = require('./utils');
module.exports = { async serpapi_locations_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const query = {};
  if (d.q) query.q = d.q;
  if (d.limit) query.limit = d.limit;
  const res = await utils.serpapiRequest(opts, '/locations.json', { query });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const items = Array.isArray(res.data) ? res.data.map((r,i)=>({id:String(r.id||i),name:r.canonical_name||r.name||'',status:'',url:'',result_json:utils.compactJson(r)})) : [];
  return { ok: true, items, totalCount: items.length, nextCursor: '' };
} };
