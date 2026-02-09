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
  async odoo_execute(node, msg, inputs, opts) {
    const data = inputs || {};
    const model = toStr(data.model);
    const method = toStr(data.method);
    if (!model) return { ok: false, error: "Champ model requis." };
    if (!method) return { ok: false, error: "Champ method requis." };

    let args = [];
    let kwargs = {};
    if (data.args) {
      try { args = JSON.parse(data.args); } catch (e) { return { ok: false, error: "Args JSON invalide: " + e.message }; }
      if (!Array.isArray(args)) return { ok: false, error: "Args doit etre un tableau JSON." };
    }
    if (data.kwargs) {
      try { kwargs = JSON.parse(data.kwargs); } catch (e) { return { ok: false, error: "Kwargs JSON invalide: " + e.message }; }
    }

    const res = await utils.odooCall(opts, model, method, args, kwargs);
    if (!res.ok) return res;
    return { ok: true, id: typeof res.data === "number" ? res.data : null, data: JSON.stringify(res.data) };
  }
};
