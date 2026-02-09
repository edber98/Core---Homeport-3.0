const { utils } = require("./utils");

module.exports = {
  async dolibarr_category_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.label && d.label !== 0) return { ok: false, error: "Champ label requis." };
    if (!d.type && d.type !== 0) return { ok: false, error: "Champ type requis." };

    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.type !== undefined && d.type !== null && d.type !== "") body.type = d.type;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.fk_parent !== undefined && d.fk_parent !== null && d.fk_parent !== "") body.fk_parent = d.fk_parent;
    if (d.color !== undefined && d.color !== null && d.color !== "") body.color = d.color;

    const res = await utils.dolibarrRequest(opts, "/categories", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
