const { utils } = require("./utils");

module.exports = {
  async mc_members_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    const count = parseInt(d.count, 10) || 10;
    const offset = parseInt(d.offset, 10) || 0;

    log('Récupération de la liste...');
    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/members`, { query: { count, offset } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.members) || [];
    const members = results.map(r => ({ id: r.id || "", email: r.email_address || "", firstName: r.merge_fields?.FNAME || "", lastName: r.merge_fields?.LNAME || "", status: r.status || "" }));
    return { ok: true, members, totalCount: res.data?.total_items || 0 };
  }
};
