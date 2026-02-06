const { utils } = require("./utils");

module.exports = {
  async ms_teams_get_meeting(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.meetingId) return { ok: false, error: "Missing meetingId." };

    const res = await utils.graphRequest(opts, `/me/onlineMeetings/${d.meetingId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const m = res.data;
    return {
      ok: true,
      id: m.id,
      subject: m.subject,
      startDateTime: m.startDateTime,
      endDateTime: m.endDateTime,
      joinWebUrl: m.joinWebUrl || ""
    };
  }
};
