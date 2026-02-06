const { utils } = require("./utils");

module.exports = {
  async nc_calendar_list(node, msg, inputs, opts) {
    const res = await utils.caldavRequest(opts, "/", {
      method: "PROPFIND",
      headers: { "Depth": "1", "Content-Type": "application/xml" },
      body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:cs="http://calendarserver.org/ns/" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:prop>
    <d:displayname/>
    <x:calendar-color/>
    <d:resourcetype/>
  </d:prop>
</d:propfind>`,
      rawBody: true
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const entries = utils.parseWebdavMultistatus(res.data);
    const calendars = entries.filter(e => e.path && e.name).map(e => ({
      displayName: e.name || "",
      color: "",
      url: e.path || ""
    }));
    return { ok: true, calendars };
  }
};
