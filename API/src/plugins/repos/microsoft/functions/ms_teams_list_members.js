const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_members(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };

    log('Récupération de la liste...');
    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/members`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const members = (res.data.value || []).map(m => ({
      id: m.id,
      displayName: m.displayName,
      email: m.email || "",
      roles: (m.roles || []).join(", ")
    }));
    const totalCount = res.data?.["@odata.count"] || members.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, members, totalCount, hasMore };
  }
};
