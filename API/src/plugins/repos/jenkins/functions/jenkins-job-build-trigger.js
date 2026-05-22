const { utils } = require('./utils');

module.exports = {
  async jenkins_job_build_trigger(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);

    const token = String(d.triggerToken || '').trim();
    const query = {};
    if (token) query.token = token;

    const res = await utils.jenkinsRequest(opts, `${jobPath}/build`, {
      method: 'POST',
      query,
      withCrumb: true,
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details, location: res.location };

    const queueId = res.location ? (/\/queue\/item\/(\d+)\/?/.exec(res.location) || [])[1] : null;
    return {
      ok: true,
      status: res.status,
      message: 'Build déclenché.',
      job_name: String(d.jobPath || ''),
      queue_id: queueId ? Number(queueId) : null,
      location: res.location || ''
    };
  }
};
