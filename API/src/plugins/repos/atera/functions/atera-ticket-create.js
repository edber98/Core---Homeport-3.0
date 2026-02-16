const { utils } = require("./utils");

module.exports = {
  async atera_ticket_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.TicketTitle) return { ok: false, error: "Missing TicketTitle." };
    if (!d.Description) return { ok: false, error: "Missing Description." };

    const body = { TicketTitle: d.TicketTitle, Description: d.Description };
    if (d.EndUserID) body.EndUserID = Number(d.EndUserID);
    if (d.EndUserEmail) body.EndUserEmail = d.EndUserEmail;
    if (d.TicketPriority) body.TicketPriority = d.TicketPriority;
    if (d.TicketImpact) body.TicketImpact = d.TicketImpact;
    if (d.TicketType) body.TicketType = d.TicketType;
    if (d.TicketStatus) body.TicketStatus = d.TicketStatus;
    if (d.TechnicianContactID) body.TechnicianContactID = Number(d.TechnicianContactID);

    log('Création en cours...');
    const res = await utils.ateraRequest(opts, "/tickets", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
