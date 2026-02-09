const { utils } = require("./utils");

module.exports = {
  async zd_macro_apply(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    const macroId = parseInt(d.macroId, 10);
    if (isNaN(macroId)) return { ok: false, error: "Missing macroId." };

    const macroRes = await utils.zendeskRequest(opts, `/macros/${macroId}/apply.json`);
    if (!macroRes.ok) return { ok: false, error: macroRes.error, status: macroRes.status, details: macroRes.details };

    const actions = macroRes.data?.result?.ticket || {};
    const ticket = {};
    if (actions.subject) ticket.subject = actions.subject;
    if (actions.comment) ticket.comment = actions.comment;
    if (actions.status) ticket.status = actions.status;
    if (actions.priority) ticket.priority = actions.priority;
    if (actions.assignee_id) ticket.assignee_id = actions.assignee_id;

    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}.json`, { method: "PUT", body: { ticket } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "applied", message: "Macro appliquée." };
  }
};
