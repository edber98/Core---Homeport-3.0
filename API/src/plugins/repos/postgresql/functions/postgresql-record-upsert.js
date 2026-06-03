const { utils } = require("./utils");

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function quoteIdentifier(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

module.exports = {
  async postgresql_record_upsert(node, msg, inputs, opts) {
    const d = inputs || {};
    const credentials = (opts && opts.credentials) || {};

    if (!d.table) return { ok: false, error: "table requis." };
    const schema = d.schema || "public";

    let data;
    try { data = parseJson(d.data, "data", {}); }
    catch (e) { return { ok: false, error: e.message }; }

    const cols = Object.keys(data || {});
    if (!cols.length) return { ok: false, error: "data JSON requis." };

    const conflictColumns = String(d.conflictColumns || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!conflictColumns.length) return { ok: false, error: "conflictColumns requis (liste séparée par virgules)." };

    const updates = cols.filter((c) => !conflictColumns.includes(c));

    const tableName = `${quoteIdentifier(schema)}.${quoteIdentifier(d.table)}`;
    const insertCols = cols.map(quoteIdentifier).join(", ");
    const insertVals = cols.map((_, i) => `$${i + 1}`).join(", ");
    const conflict = conflictColumns.map(quoteIdentifier).join(", ");

    const sql = updates.length
      ? `INSERT INTO ${tableName} (${insertCols}) VALUES (${insertVals}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates.map((c) => `${quoteIdentifier(c)} = EXCLUDED.${quoteIdentifier(c)}`).join(", ")} RETURNING *`
      : `INSERT INTO ${tableName} (${insertCols}) VALUES (${insertVals}) ON CONFLICT (${conflict}) DO NOTHING RETURNING *`;

    const res = await utils.query(credentials, sql, cols.map((c) => data[c]));
    if (!res.ok) return res;

    return { ok: true, message: "Upsert exécuté.", affectedRows: res.rowCount || 0, rows: res.rows || [], raw: res.raw || res };
  }
};
