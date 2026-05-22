const { utils } = require('./utils');

module.exports = {
  async jenkins_build_stop(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const buildNumber = String(d.buildNumber || '').trim();
    if (!buildNumber) return { ok: false, error: 'buildNumber requis.' };

    const hardStop = String(d.stopMode || '').trim().toLowerCase() === 'term';
    const endpoint = hardStop ? 'term' : 'stop';

    const res = await utils.jenkinsRequest(opts, `${jobPath}/${encodeURIComponent(buildNumber)}/${endpoint}`, {
      method: 'POST',
      withCrumb: true,
      accept: 'application/json'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: res.status,
      message: hardStop ? 'Build terminé de force.' : 'Build arrêté.',
      build_number: Number(buildNumber),
      job_name: String(d.jobPath || '')
    };
  }
};
