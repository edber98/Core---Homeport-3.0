const { utils } = require("./utils");

module.exports = {
  async nc_calendar_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Identifiant du calendrier requis." };
    if (!d.displayName) return { ok: false, error: "Nom affiché requis." };
    const color = d.color || "#0082C9";
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:set>
    <d:prop>
      <d:displayname>${d.displayName}</d:displayname>
      <x:calendar-color>${color}</x:calendar-color>
      <c:supported-calendar-component-set>
        <c:comp name="VEVENT"/>
      </c:supported-calendar-component-set>
    </d:prop>
  </d:set>
</c:mkcalendar>`;
    const res = await utils.caldavRequest(opts, d.calendarName + "/", {
      method: "MKCALENDAR",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/xml" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "created", message: `Calendrier créé: ${d.displayName}` };
  }
};
