const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_meetings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let path = "/me/onlineMeetings";
    if (d.top) path += `?$top=${d.top}`;

    log('Récupération de la liste...');
    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const meetings = (res.data.value || []).map(m => ({
      id: m.id,
      subject: m.subject,
      startDateTime: m.startDateTime,
      endDateTime: m.endDateTime,
      joinWebUrl: m.joinWebUrl || ""
    }));
    const totalCount = res.data?.["@odata.count"] || meetings.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, meetings, totalCount, hasMore };
  }
};
