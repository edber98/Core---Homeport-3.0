const { utils } = require('./utils');

module.exports = {
  async jenkins_job_config_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const configXml = String(d.configXml || '').trim();
    if (!configXml) return { ok: false, error: 'configXml requis.' };

    const res = await utils.jenkinsRequest(opts, `${jobPath}/config.xml`, {
      method: 'POST',
      rawBody: configXml,
      contentType: 'application/xml',
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: 'Configuration mise à jour.',
      job_name: String(d.jobPath || '')
    };
  }
};
