const { utils } = require("./utils");

function toStr(value) {
  const str = String(value || "").trim();
  return str || null;
}

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_tasks_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
        const data = inputs || {};
        const limit = toInt(data.limit) || 50;
        const domain = [];
        if (toInt(data.project_id)) domain.push(["project_id", "=", toInt(data.project_id)]);
        if (toInt(data.stage_id)) domain.push(["stage_id", "=", toInt(data.stage_id)]);

        const res = await utils.odooCall(opts, "project.task", "search_read", [], {
          domain, limit
        });
        if (!res.ok) return res;
        const countRes = await utils.odooCall(opts, "project.task", "search_count", [], { domain });
        if (!countRes.ok) return countRes;
        return { ok: true, tasks: res.data, totalCount: countRes.data || 0 };
  }
};
