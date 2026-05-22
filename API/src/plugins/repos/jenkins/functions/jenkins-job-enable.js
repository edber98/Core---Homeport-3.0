const { utils } = require('./utils');

module.exports = {
  async jenkins_job_enable(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);

    const res = await utils.jenkinsRequest(opts, `${jobPath}/enable`, {
      method: 'POST',
      withCrumb: true,
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: res.status, message: 'Job activé.', job_name: String(d.jobPath || '') };
  }
};
