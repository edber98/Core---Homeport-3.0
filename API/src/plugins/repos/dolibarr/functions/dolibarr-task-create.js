const { utils } = require("./utils");

module.exports = {
  async dolibarr_task_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fk_project && d.fk_project !== 0) return { ok: false, error: "Champ fk_project requis." };
    if (!d.label && d.label !== 0) return { ok: false, error: "Champ label requis." };

    const body = {};
    if (d.fk_project !== undefined && d.fk_project !== null && d.fk_project !== "") body.fk_project = d.fk_project;
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.fk_task_parent !== undefined && d.fk_task_parent !== null && d.fk_task_parent !== "") body.fk_task_parent = d.fk_task_parent;
    if (d.date_start !== undefined && d.date_start !== null && d.date_start !== "") body.date_start = d.date_start;
    if (d.date_end !== undefined && d.date_end !== null && d.date_end !== "") body.date_end = d.date_end;
    if (d.planned_workload !== undefined && d.planned_workload !== null && d.planned_workload !== "") body.planned_workload = d.planned_workload;
    if (d.progress !== undefined && d.progress !== null && d.progress !== "") body.progress = d.progress;

    log('Création en cours...');
    const res = await utils.dolibarrRequest(opts, "/tasks", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
