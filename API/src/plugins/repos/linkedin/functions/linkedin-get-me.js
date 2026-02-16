const { utils } = require("./utils");

module.exports = {
  async linkedin_get_me(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des données...');
    const res = await utils.linkedinRequest(opts, "/userinfo", {
      baseUrl: "https://api.linkedin.com"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.sub,
      firstName: r.given_name,
      lastName: r.family_name,
      email: r.email,
      picture: r.picture,
      locale: r.locale
    };
  }
};
