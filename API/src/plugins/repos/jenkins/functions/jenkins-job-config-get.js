const { utils } = require('./utils');

module.exports = {
  async jenkins_job_config_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);

    const res = await utils.jenkinsRequest(opts, `${jobPath}/config.xml`, {
      method: 'GET',
      responseType: 'text',
      accept: 'application/xml'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      job_name: String(d.jobPath || ''),
      url: `${jobPath}/config.xml`,
      config_xml: String(res.data || '')
    };
  }
};
