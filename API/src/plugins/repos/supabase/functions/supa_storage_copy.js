const { utils } = require('./utils');
module.exports = { async supa_storage_copy(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.bucket || !d.fromPath || !d.toPath) return { ok: false, error: 'bucket, fromPath, toPath requis.' };
  const res = await utils.supaStorage(opts, `/object/copy`, { method: 'POST', body: { bucketId: d.bucket, sourceKey: d.fromPath, destinationKey: d.toPath } });
  if (!res.ok) return res;
  return { ok: true, status: 'copied', path: d.toPath, bucket: d.bucket };
}};
