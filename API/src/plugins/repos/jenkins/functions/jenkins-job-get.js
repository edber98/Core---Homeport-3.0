const { utils } = require('./utils');

module.exports = {
  async jenkins_job_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);

    const res = await utils.jenkinsRequest(opts, `${jobPath}/api/json`, {
      method: 'GET',
      query: {
        tree: String(d.tree || 'name,fullName,url,color,buildable,inQueue,description,lastBuild[number,url,result,building],nextBuildNumber')
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, ...utils.mapJob(res.data) };
  }
};
