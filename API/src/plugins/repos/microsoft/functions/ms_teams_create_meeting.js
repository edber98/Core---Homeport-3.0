const { utils } = require("./utils");

module.exports = {
  async ms_teams_create_meeting(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.subject) return { ok: false, error: "Missing subject." };
    if (!d.startDateTime) return { ok: false, error: "Missing startDateTime." };
    if (!d.endDateTime) return { ok: false, error: "Missing endDateTime." };

    const body = {
      subject: d.subject,
      startDateTime: d.startDateTime,
      endDateTime: d.endDateTime
    };

    if (d.participants) {
      const emails = d.participants.split(",").map(e => e.trim()).filter(Boolean);
      body.participants = {
        attendees: emails.map(email => ({
          upn: email,
          role: "attendee"
        }))
      };
    }

    const res = await utils.graphRequest(opts, "/me/onlineMeetings", {
      method: "POST",
      body
    });
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
