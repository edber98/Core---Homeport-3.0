function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function cleanString(value) {
  return String(value || "").trim();
}

function safeLabel(value) {
  const s = cleanString(value);
  if (!s) return "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`Label invalide: ${s}`);
  return s;
}

function safeRelType(value) {
  const s = cleanString(value);
  if (!s) return "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`Type de relation invalide: ${s}`);
  return s;
}

function normalizeValue(neo4j, value) {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt && neo4j.isInt(value)) {
    try {
      if (typeof value.inSafeRange === "function" && value.inSafeRange()) return value.toNumber();
    } catch {}
    return String(value);
  }
  if (Array.isArray(value)) return value.map((v) => normalizeValue(neo4j, v));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeValue(neo4j, v);
    return out;
  }
  return value;
}

function normalizeRecord(neo4j, record) {
  const out = {};
  for (const key of record.keys || []) {
    out[key] = normalizeValue(neo4j, record.get(key));
  }
  return out;
}

function rowsResult(rowPayload, raw) {
  const rows = rowPayload || [];
  const fields = rows.length ? Object.keys(rows[0]) : [];
  return { ok: true, rowCount: rows.length, fields, rows, raw: raw || rows };
}

function listResult(items, raw) {
  return { ok: true, totalCount: items.length, items, raw: raw || items };
}

function actionResult(message, raw, status = 200) {
  return { ok: true, status, message, raw };
}

function recordResult(record, nameField) {
  const properties = record.properties || {};
  return {
    ok: true,
    id: String(record.id || ""),
    name: String((nameField && properties[nameField]) || properties.name || ""),
    status: "ok",
    properties,
    raw: record
  };
}

async function withDriver(opts, databaseOverride, worker) {
  const credentials = (opts && opts.credentials) || {};
  if (credentials.uri === "test" && credentials.username === "test") {
    return worker({
      neo4j: null,
      run: async () => ({ records: [] }),
      executeRead: async (fn) => fn({ run: async () => ({ records: [] }) }),
      executeWrite: async (fn) => fn({ run: async () => ({ records: [] }) })
    });
  }

  const uri = cleanString(credentials.uri);
  const username = cleanString(credentials.username);
  const password = credentials.password;
  const database = cleanString(databaseOverride || credentials.database || "neo4j");

  if (!uri || !username || password === undefined || password === null || password === "") {
    return { ok: false, error: "Identifiants Neo4j requis: uri, username, password." };
  }

  let neo4j;
  try {
    neo4j = require("neo4j-driver");
  } catch {
    return { ok: false, error: "Le package 'neo4j-driver' n'est pas installé. Exécuter: npm install neo4j-driver dans API/." };
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, String(password)));
  const session = driver.session({ database });
  try {
    const result = await worker({
      neo4j,
      run: (query, params) => session.run(query, params || {}),
      executeRead: (fn) => session.executeRead(fn),
      executeWrite: (fn) => session.executeWrite(fn)
    });
    await session.close();
    await driver.close();
    return result;
  } catch (e) {
    try { await session.close(); } catch {}
    try { await driver.close(); } catch {}
    return { ok: false, error: e.message };
  }
}

async function run(key, inputs, opts) {
  const d = inputs || {};
  try {
    if (key === "neo4j_query_execute") {
      const query = cleanString(d.query);
      if (!query) return { ok: false, error: "Requête Cypher requise." };
      const params = parseJson(d.params, "params", {});
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, params);
        const rows = (res.records || []).map((r) => normalizeRecord(neo4j, r));
        return rowsResult(rows, rows);
      });
    }

    if (key === "neo4j_query_read") {
      const query = cleanString(d.query);
      if (!query) return { ok: false, error: "Requête Cypher requise." };
      const params = parseJson(d.params, "params", {});
      return withDriver(opts, d.database, async ({ neo4j, executeRead }) => {
        const res = await executeRead((tx) => tx.run(query, params));
        const rows = (res.records || []).map((r) => normalizeRecord(neo4j, r));
        return rowsResult(rows, rows);
      });
    }

    if (key === "neo4j_query_write") {
      const query = cleanString(d.query);
      if (!query) return { ok: false, error: "Requête Cypher requise." };
      const params = parseJson(d.params, "params", {});
      return withDriver(opts, d.database, async ({ neo4j, executeWrite }) => {
        const res = await executeWrite((tx) => tx.run(query, params));
        const rows = (res.records || []).map((r) => normalizeRecord(neo4j, r));
        return rowsResult(rows, rows);
      });
    }

    if (key === "neo4j_transaction_execute") {
      const statements = parseJson(d.statements, "statements", []);
      if (!Array.isArray(statements) || statements.length === 0) return { ok: false, error: "statements doit être un tableau non vide." };
      return withDriver(opts, d.database, async ({ neo4j, executeWrite }) => {
        const raw = await executeWrite(async (tx) => {
          const out = [];
          for (const item of statements) {
            const query = cleanString(item && item.query);
            if (!query) throw new Error("Chaque statement doit contenir query.");
            const params = item && item.params && typeof item.params === "object" ? item.params : {};
            const res = await tx.run(query, params);
            out.push((res.records || []).map((r) => normalizeRecord(neo4j, r)));
          }
          return out;
        });
        const rows = raw.flat();
        return rowsResult(rows, raw);
      });
    }

    if (key === "neo4j_node_create") {
      const labels = String(d.labels || "").split(",").map((x) => safeLabel(x)).filter(Boolean);
      const properties = parseJson(d.properties, "properties", null);
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { ok: false, error: "properties doit être un objet JSON." };
      const labelsPart = labels.length ? ":" + labels.join(":") : "";
      const query = `CREATE (n${labelsPart} $props) RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { props: properties });
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : null;
        if (!row) return { ok: false, error: "Aucun nœud créé." };
        return recordResult({ id: row.id, properties: { ...row.properties, labels: row.labels } });
      });
    }

    if (key === "neo4j_nodes_match") {
      const label = safeLabel(d.label || "");
      const where = cleanString(d.where);
      const params = parseJson(d.params, "params", {});
      const limit = Math.max(1, Math.min(Number(d.limit || 100), 5000));
      const labelPart = label ? `:${label}` : "";
      const wherePart = where ? ` WHERE ${where}` : "";
      const query = `MATCH (n${labelPart})${wherePart} RETURN elementId(n) AS id, labels(n) AS labels, properties(n) AS properties LIMIT $limit`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { ...params, limit });
        const items = (res.records || []).map((r) => {
          const row = normalizeRecord(neo4j, r);
          return {
            id: String(row.id || ""),
            name: String((row.properties && row.properties.name) || ""),
            status: "ok",
            properties: { ...(row.properties || {}), labels: row.labels || [] },
            raw: row
          };
        });
        return listResult(items, items);
      });
    }

    if (key === "neo4j_nodes_update") {
      const label = safeLabel(d.label || "");
      const where = cleanString(d.where);
      if (!where) return { ok: false, error: "Clause WHERE requise." };
      const params = parseJson(d.params, "params", {});
      const properties = parseJson(d.properties, "properties", null);
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { ok: false, error: "properties doit être un objet JSON." };
      const labelPart = label ? `:${label}` : "";
      const query = `MATCH (n${labelPart}) WHERE ${where} SET n += $props RETURN count(n) AS updatedCount`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { ...params, props: properties });
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : { updatedCount: 0 };
        return actionResult(`${Number(row.updatedCount || 0)} nœud(s) mis à jour.`, row);
      });
    }

    if (key === "neo4j_nodes_delete") {
      const label = safeLabel(d.label || "");
      const where = cleanString(d.where);
      if (!where) return { ok: false, error: "Clause WHERE requise." };
      const params = parseJson(d.params, "params", {});
      const detach = d.detach === false ? false : true;
      const labelPart = label ? `:${label}` : "";
      const query = `MATCH (n${labelPart}) WHERE ${where} ${detach ? "DETACH" : ""} DELETE n RETURN count(n) AS deletedCount`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, params);
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : { deletedCount: 0 };
        return actionResult(`${Number(row.deletedCount || 0)} nœud(s) supprimé(s).`, row);
      });
    }

    if (key === "neo4j_relationship_create") {
      const fromId = cleanString(d.fromId);
      const toId = cleanString(d.toId);
      const type = safeRelType(d.type || "");
      if (!fromId || !toId || !type) return { ok: false, error: "fromId, toId et type sont requis." };
      const properties = parseJson(d.properties, "properties", {});
      const query = `MATCH (a) WHERE elementId(a) = $fromId MATCH (b) WHERE elementId(b) = $toId CREATE (a)-[r:${type} $props]->(b) RETURN elementId(r) AS id, type(r) AS type, properties(r) AS properties`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { fromId, toId, props: properties });
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : null;
        if (!row) return { ok: false, error: "Relation non créée." };
        return recordResult({ id: row.id, properties: { ...(row.properties || {}), type: row.type } }, "type");
      });
    }

    if (key === "neo4j_relationships_delete") {
      const type = safeRelType(d.type || "");
      const where = cleanString(d.where);
      const params = parseJson(d.params, "params", {});
      const limit = Math.max(1, Math.min(Number(d.limit || 1000), 50000));
      const typePart = type ? `:${type}` : "";
      const wherePart = where ? ` WHERE ${where}` : "";
      const query = `MATCH ()-[r${typePart}]-()${wherePart} WITH r LIMIT $limit DELETE r RETURN count(r) AS deletedCount`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { ...params, limit });
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : { deletedCount: 0 };
        return actionResult(`${Number(row.deletedCount || 0)} relation(s) supprimée(s).`, row);
      });
    }

    if (key === "neo4j_relationships_match") {
      const type = safeRelType(d.type || "");
      const where = cleanString(d.where);
      const params = parseJson(d.params, "params", {});
      const limit = Math.max(1, Math.min(Number(d.limit || 100), 5000));
      const typePart = type ? `:${type}` : "";
      const wherePart = where ? ` WHERE ${where}` : "";
      const query = `MATCH (a)-[r${typePart}]->(b)${wherePart} RETURN elementId(r) AS id, type(r) AS type, properties(r) AS properties, elementId(a) AS fromId, elementId(b) AS toId LIMIT $limit`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { ...params, limit });
        const items = (res.records || []).map((r) => {
          const row = normalizeRecord(neo4j, r);
          return {
            id: String(row.id || ""),
            name: String(row.type || ""),
            status: "ok",
            properties: { ...(row.properties || {}), type: row.type, fromId: row.fromId, toId: row.toId },
            raw: row
          };
        });
        return listResult(items, items);
      });
    }

    if (key === "neo4j_relationships_update") {
      const type = safeRelType(d.type || "");
      const where = cleanString(d.where);
      if (!where) return { ok: false, error: "Clause WHERE requise." };
      const params = parseJson(d.params, "params", {});
      const properties = parseJson(d.properties, "properties", null);
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) return { ok: false, error: "properties doit être un objet JSON." };
      const typePart = type ? `:${type}` : "";
      const query = `MATCH ()-[r${typePart}]-() WHERE ${where} SET r += $props RETURN count(r) AS updatedCount`;
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run(query, { ...params, props: properties });
        const row = res.records && res.records[0] ? normalizeRecord(neo4j, res.records[0]) : { updatedCount: 0 };
        return actionResult(`${Number(row.updatedCount || 0)} relation(s) mise(s) à jour.`, row);
      });
    }

    if (key === "neo4j_labels_list") {
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run("CALL db.labels() YIELD label RETURN label ORDER BY label", {});
        const items = (res.records || []).map((r) => {
          const row = normalizeRecord(neo4j, r);
          return { id: row.label, name: row.label, status: "ok", properties: {}, raw: row };
        });
        return listResult(items, items);
      });
    }

    if (key === "neo4j_relationship_types_list") {
      return withDriver(opts, d.database, async ({ neo4j, run }) => {
        const res = await run("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType", {});
        const items = (res.records || []).map((r) => {
          const row = normalizeRecord(neo4j, r);
          return { id: row.relationshipType, name: row.relationshipType, status: "ok", properties: {}, raw: row };
        });
        return listResult(items, items);
      });
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson } };
