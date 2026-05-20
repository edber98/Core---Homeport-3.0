const { utils } = require('./utils');

module.exports = {
  async jenkins_job_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const parentPath = utils.toObjectPath(d.parentPath);
    const jobName = String(d.jobName || '').trim();
    const configXml = String(d.configXml || '').trim();
    if (!jobName) return { ok: false, error: 'jobName requis.' };
    if (!configXml) return { ok: false, error: 'configXml requis.' };

    const res = await utils.jenkinsRequest(opts, `${parentPath}/createItem`, {
      method: 'POST',
      query: { name: jobName },
      rawBody: configXml,
      contentType: 'application/xml',
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details, location: res.location };

    return {
      ok: true,
      status: res.status,
      message: 'Job créé.',
      job_name: jobName,
      location: res.location || ''
    };
  }
};
