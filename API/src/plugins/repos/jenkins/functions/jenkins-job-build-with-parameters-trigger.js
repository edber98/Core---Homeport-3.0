const { utils } = require('./utils');

module.exports = {
  async jenkins_job_build_with_parameters_trigger(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);

    let params = {};
    try {
      params = utils.parseJsonInput(d.parameters, 'parameters', {});
      params = { ...params, ...utils.parseQueryString(d.parametersQuery) };
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const token = String(d.triggerToken || '').trim();
    if (token) params.token = token;

    const res = await utils.jenkinsRequest(opts, `${jobPath}/buildWithParameters`, {
      method: 'POST',
      query: params,
      withCrumb: true,
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details, location: res.location };

    const queueId = res.location ? (/\/queue\/item\/(\d+)\/?/.exec(res.location) || [])[1] : null;
    return {
      ok: true,
      status: res.status,
      message: 'Build paramétré déclenché.',
      job_name: String(d.jobPath || ''),
      queue_id: queueId ? Number(queueId) : null,
      location: res.location || ''
    };
  }
};
