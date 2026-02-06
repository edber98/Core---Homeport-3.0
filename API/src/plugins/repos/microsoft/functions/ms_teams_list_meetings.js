const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_meetings(node, msg, inputs, opts) {
    const d = inputs || {};
    let path = "/me/onlineMeetings";
    if (d.top) path += `?$top=${d.top}`;

    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const meetings = (res.data.value || []).map(m => ({
      id: m.id,
      subject: m.subject,
      startDateTime: m.startDateTime,
      endDateTime: m.endDateTime,
      joinWebUrl: m.joinWebUrl || ""
    }));
    return { ok: true, meetings };
  }
};
