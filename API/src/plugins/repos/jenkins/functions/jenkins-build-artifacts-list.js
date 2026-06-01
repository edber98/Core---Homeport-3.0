const { utils } = require('./utils');

module.exports = {
  async jenkins_build_artifacts_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const buildNumber = String(d.buildNumber || '').trim();
    if (!buildNumber) return { ok: false, error: 'buildNumber requis.' };

    const res = await utils.jenkinsRequest(opts, `${jobPath}/${encodeURIComponent(buildNumber)}/api/json`, {
      method: 'GET',
      query: { tree: 'id,number,url,artifacts[fileName,relativePath]' }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const artifacts = Array.isArray(res.data?.artifacts)
      ? res.data.artifacts.map((a) => ({ fileName: a.fileName || '', relativePath: a.relativePath || '' }))
      : [];

    return {
      ok: true,
      build: { id: res.data?.id || '', number: res.data?.number || null, url: res.data?.url || '' },
      totalCount: artifacts.length,
      artifacts,
      raw: res.data || {}
    };
  }
};
