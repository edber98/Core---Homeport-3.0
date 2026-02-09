const { utils } = require("./utils");

module.exports = {
  async dolibarr_project_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.ref && d.ref !== 0) return { ok: false, error: "Champ ref requis." };
    if (!d.title && d.title !== 0) return { ok: false, error: "Champ title requis." };

    const body = {};
    if (d.ref !== undefined && d.ref !== null && d.ref !== "") body.ref = d.ref;
    if (d.title !== undefined && d.title !== null && d.title !== "") body.title = d.title;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.socid !== undefined && d.socid !== null && d.socid !== "") body.socid = d.socid;
    if (d.date_start !== undefined && d.date_start !== null && d.date_start !== "") body.date_start = d.date_start;
    if (d.date_end !== undefined && d.date_end !== null && d.date_end !== "") body.date_end = d.date_end;
    if (d.budget_amount !== undefined && d.budget_amount !== null && d.budget_amount !== "") body.budget_amount = d.budget_amount;
    if (d.public !== undefined && d.public !== null && d.public !== "") body.public = d.public;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;
    if (d.note_private !== undefined && d.note_private !== null && d.note_private !== "") body.note_private = d.note_private;

    const res = await utils.dolibarrRequest(opts, "/projects", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
