const { utils } = require('./utils');

module.exports = {
  async jenkins_system_info_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.jenkinsRequest(opts, '/api/json', {
      method: 'GET',
      query: {
        tree: String(d.tree || 'mode,nodeDescription,numExecutors,quieting,useCrumbs,views[name,url],jobs[name,url,color]')
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      status: 200,
      message: 'Informations système Jenkins récupérées.',
      raw: res.data || {}
    };
  }
};
