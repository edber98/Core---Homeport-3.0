const { utils } = require("./utils");

module.exports = {
  async nc_events_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Calendrier requis." };

    let timeRange = "";
    if (d.start || d.end) {
      const fmt = (s) => s ? s.replace(/[-:]/g, "").replace(/\.\d+/, "").substring(0, 15) + "Z" : "";
      const startStr = fmt(d.start) || "19700101T000000Z";
      const endStr = fmt(d.end) || "20991231T235959Z";
      timeRange = `<c:time-range start="${startStr}" end="${endStr}"/>`;
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        ${timeRange}
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    const res = await utils.caldavRequest(opts, d.calendarName + "/", {
      method: "REPORT",
      body,
      rawBody: true,
      headers: { "Content-Type": "application/xml", "Depth": "1" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    // Parse the multistatus and extract iCal data from each response
    const ms = res.data;
    let events = [];
    if (typeof ms === "object") {
      const mst = ms["d:multistatus"] || ms["D:multistatus"] || ms.multistatus || ms;
      let responses = mst["d:response"] || mst["D:response"] || mst.response || [];
      if (!Array.isArray(responses)) responses = [responses];
      for (const r of responses) {
        const props = r["d:propstat"]?.["d:prop"] || r["D:propstat"]?.["D:prop"] || r?.propstat?.prop || {};
        const icsData = props["cal:calendar-data"] || props["c:calendar-data"] || props["C:calendar-data"] || props["calendar-data"] || "";
        if (icsData) {
          const evt = utils.parseICalEvent(typeof icsData === "string" ? icsData : "");
          if (evt.summary || evt.id) events.push(evt);
        }
      }
    }
    return { ok: true, events };
  }
};
