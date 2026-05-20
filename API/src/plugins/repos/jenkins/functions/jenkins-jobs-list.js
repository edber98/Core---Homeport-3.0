const { utils } = require('./utils');

module.exports = {
  async jenkins_jobs_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const log = (opts && opts.log) ? opts.log : () => {};

    const objectPath = utils.toObjectPath(d.objectPath);
    const query = {
      tree: String(d.tree || 'jobs[name,fullName,url,color,buildable,inQueue,lastBuild[number,url],nextBuildNumber,description]'),
      depth: d.depth
    };

    log('Liste des jobs Jenkins...');
    const res = await utils.jenkinsRequest(opts, `${objectPath}/api/json`, { method: 'GET', query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const jobs = Array.isArray(res.data && res.data.jobs) ? res.data.jobs : [];
    return {
      ok: true,
      jobs: jobs.map(utils.mapJob),
      totalCount: jobs.length,
      raw: res.data || {}
    };
  }
};
