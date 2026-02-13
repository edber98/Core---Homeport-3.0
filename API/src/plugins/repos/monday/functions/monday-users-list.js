const { utils } = require("./utils");
module.exports = {
  async monday_users_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const limit = parseInt(d.limit, 10) || 25;
    const query = `{ users (limit: ${limit}) { id name email } }`;
    log('Récupération de la liste...');
    const res = await utils.mondayRequest(opts, query);
    if (!res.ok) return { ok: false, error: res.error, details: res.details };
    const users = (res.data.users || []).map(r => ({ id: r.id, name: r.name, email: r.email }));
    return { ok: true, users, totalCount: String(users.length) };
  }
};
