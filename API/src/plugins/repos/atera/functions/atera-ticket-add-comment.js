const { utils } = require("./utils");

module.exports = {
  async atera_ticket_add_comment(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };
    if (!d.CommentText) return { ok: false, error: "Missing CommentText." };

    const body = { CommentText: d.CommentText };

    if (d.TechnicianId) {
      body.TechnicianCommentDetails = {
        TechnicianId: Number(d.TechnicianId),
        IsInternal: d.IsInternal === "true" || d.IsInternal === true
      };
    } else if (d.EnduserId) {
      body.EnduserCommentDetails = { EnduserId: Number(d.EnduserId) };
    }

    const res = await utils.ateraRequest(opts, `/tickets/${encodeURIComponent(d.ticketId)}/comments`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
