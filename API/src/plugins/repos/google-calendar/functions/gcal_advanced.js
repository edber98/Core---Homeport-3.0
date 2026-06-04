const { utils } = require("./utils");

function buildEventPatch(d = {}) {
  const body = {};
  if (d.summary) body.summary = d.summary;
  if (d.description != null) body.description = d.description;
  if (d.location != null) body.location = d.location;
  if (d.status) body.status = d.status;
  if (d.colorId) body.colorId = d.colorId;
  if (d.start_dateTime) {
    body.start = { dateTime: d.start_dateTime };
    if (d.start_timeZone) body.start.timeZone = d.start_timeZone;
  }
  if (d.end_dateTime) {
    body.end = { dateTime: d.end_dateTime };
    if (d.end_timeZone) body.end.timeZone = d.end_timeZone;
  }
  if (d.attendees) {
    body.attendees = String(d.attendees)
      .split(",")
      .map((email) => ({ email: email.trim() }))
      .filter((attendee) => attendee.email);
  }
  if (d.recurrence) body.recurrence = [d.recurrence];
  return body;
}

function buildEventResource(d = {}, { requireICalUID = false } = {}) {
  const body = buildEventPatch(d);
  if (d.summary) body.summary = d.summary;
  if (requireICalUID) body.iCalUID = d.iCalUID;
  return body;
}

function buildCalendarListBody(d = {}) {
  const body = {};
  if (d.calendarId) body.id = d.calendarId;
  if (d.summaryOverride) body.summaryOverride = d.summaryOverride;
  if (d.colorId) body.colorId = d.colorId;
  if (d.backgroundColor) body.backgroundColor = d.backgroundColor;
  if (d.foregroundColor) body.foregroundColor = d.foregroundColor;
  if (d.hidden !== undefined && d.hidden !== null && d.hidden !== "") body.hidden = !!d.hidden;
  if (d.selected !== undefined && d.selected !== null && d.selected !== "") body.selected = !!d.selected;
  if (d.defaultRemindersJson) body.defaultReminders = utils.parseJsonInput(d.defaultRemindersJson, "defaultRemindersJson");
  if (d.notificationSettingsJson) {
    body.notificationSettings = utils.parseJsonInput(d.notificationSettingsJson, "notificationSettingsJson");
  }
  return body;
}

function toCalendarListEntry(entry = {}) {
  return {
    id: entry.id || "",
    summary: entry.summary || "",
    description: entry.description || "",
    timeZone: entry.timeZone || "",
    accessRole: entry.accessRole || "",
    summaryOverride: entry.summaryOverride || "",
    colorId: entry.colorId || "",
    backgroundColor: entry.backgroundColor || "",
    foregroundColor: entry.foregroundColor || "",
    hidden: !!entry.hidden,
    selected: entry.selected !== false,
    primary: !!entry.primary,
  };
}

module.exports = {
  async gcal_patch_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const calendarId = d.calendarId || "primary";
    if (!d.eventId) return { ok: false, error: "Missing eventId." };

    const body = buildEventPatch(d);
    if (!Object.keys(body).length) return { ok: false, error: "No updatable fields provided." };

    log("Patch de l'evenement...");
    const res = await utils.googleRequest(
      opts,
      `${utils.CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(d.eventId)}`,
      { method: "PATCH", body }
    );
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  },

  async gcal_freebusy_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.timeMin || !d.timeMax) return { ok: false, error: "Missing timeMin or timeMax." };

    const calendarIds = utils.parseStringList(d.calendarIds || d.calendarIdsJson);
    if (!calendarIds.length) return { ok: false, error: "Missing calendarIds." };

    const body = {
      timeMin: d.timeMin,
      timeMax: d.timeMax,
      items: calendarIds.map((id) => ({ id })),
    };
    if (d.timeZone) body.timeZone = d.timeZone;

    log("Lecture des disponibilites...");
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/freeBusy`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      timeMin: res.data.timeMin || d.timeMin,
      timeMax: res.data.timeMax || d.timeMax,
      calendarsJson: JSON.stringify(res.data.calendars || {}),
      groupsJson: JSON.stringify(res.data.groups || {}),
    };
  },

  async gcal_subscribe_calendar(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarId) return { ok: false, error: "Missing calendarId." };

    let body;
    try {
      body = buildCalendarListBody(d);
    } catch (error) {
      return { ok: false, error: error.message };
    }

    const params = new URLSearchParams();
    if (d.backgroundColor || d.foregroundColor) params.set("colorRgbFormat", "true");

    log("Abonnement au calendrier...");
    const res = await utils.googleRequest(
      opts,
      `${utils.CALENDAR_API}/users/me/calendarList${params.toString() ? `?${params}` : ""}`,
      { method: "POST", body }
    );
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...toCalendarListEntry(res.data) };
  },

  async gcal_update_calendar_subscription(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarId) return { ok: false, error: "Missing calendarId." };

    let body;
    try {
      body = buildCalendarListBody(d);
    } catch (error) {
      return { ok: false, error: error.message };
    }
    delete body.id;
    if (!Object.keys(body).length) return { ok: false, error: "No updatable fields provided." };

    const params = new URLSearchParams();
    if (d.backgroundColor || d.foregroundColor) params.set("colorRgbFormat", "true");

    log("Mise a jour de l abonnement...");
    const res = await utils.googleRequest(
      opts,
      `${utils.CALENDAR_API}/users/me/calendarList/${encodeURIComponent(d.calendarId)}${params.toString() ? `?${params}` : ""}`,
      { method: "PATCH", body }
    );
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...toCalendarListEntry(res.data) };
  },

  async gcal_unsubscribe_calendar(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarId) return { ok: false, error: "Missing calendarId." };

    log("Desabonnement du calendrier...");
    const res = await utils.googleRequest(
      opts,
      `${utils.CALENDAR_API}/users/me/calendarList/${encodeURIComponent(d.calendarId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Calendar subscription removed successfully." };
  },

  async gcal_get_colors(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};

    log("Lecture des couleurs...");
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/colors`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      updated: res.data.updated || "",
      calendarColorsJson: JSON.stringify(res.data.calendar || {}),
      eventColorsJson: JSON.stringify(res.data.event || {}),
    };
  },

  async gcal_import_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const calendarId = d.calendarId || "primary";
    if (!d.iCalUID) return { ok: false, error: "Missing iCalUID." };
    if (!d.start_dateTime) return { ok: false, error: "Missing start_dateTime." };
    if (!d.end_dateTime) return { ok: false, error: "Missing end_dateTime." };

    const body = buildEventResource(d, { requireICalUID: true });

    log("Import de l evenement...");
    const res = await utils.googleRequest(
      opts,
      `${utils.CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/import`,
      { method: "POST", body }
    );
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  },
};
