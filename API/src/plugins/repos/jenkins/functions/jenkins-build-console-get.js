const { utils } = require('./utils');

module.exports = {
  async jenkins_build_console_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const jobPath = utils.toJobPath(d.jobPath);
    const buildNumber = String(d.buildNumber || '').trim();
    if (!buildNumber) return { ok: false, error: 'buildNumber requis.' };

    const progressive = !!d.progressive;
    const path = progressive
      ? `${jobPath}/${encodeURIComponent(buildNumber)}/logText/progressiveText`
      : `${jobPath}/${encodeURIComponent(buildNumber)}/consoleText`;

    const res = await utils.jenkinsRequest(opts, path, {
      method: 'GET',
      query: progressive ? { start: d.start || 0 } : {},
      responseType: 'text',
      accept: 'text/plain'
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      build_number: Number(buildNumber),
      text: String(res.data || ''),
      nextStart: null,
      moreData: null
    };
  }
};
