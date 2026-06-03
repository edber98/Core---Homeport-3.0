const { utils } = require('./utils');

module.exports = {
  async jenkins_build_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const buildNumber = String(d.buildNumber || '').trim();
    if (!buildNumber) return { ok: false, error: 'buildNumber requis.' };

    const res = await utils.jenkinsRequest(opts, `${jobPath}/${encodeURIComponent(buildNumber)}/api/json`, {
      method: 'GET',
      query: {
        tree: String(d.tree || 'id,number,url,result,building,duration,estimatedDuration,timestamp,queueId,description,fullDisplayName')
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapBuild(res.data) };
  }
};
