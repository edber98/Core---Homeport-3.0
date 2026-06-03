const { utils } = require('./utils');

module.exports = {
  async jenkins_job_builds_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const depth = Math.max(1, Math.min(parseInt(d.limit, 10) || 20, 200));

    const res = await utils.jenkinsRequest(opts, `${jobPath}/api/json`, {
      method: 'GET',
      query: {
        tree: `builds[number,url,result,building,duration,estimatedDuration,timestamp,queueId,description,fullDisplayName]{0,${depth}}`
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const builds = Array.isArray(res.data?.builds) ? res.data.builds.map(utils.mapBuild) : [];
    return { ok: true, totalCount: builds.length, builds, raw: res.data || {} };
  }
};
