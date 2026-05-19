function isTestCredentials(credentials) {
  return credentials && credentials.connectionString === "test";
}

function parseJson(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { throw new Error(`JSON invalide dans ${label}.`); }
}

function getConfig(credentials) {
  const c = credentials || {};
  if (!c.connectionString || !c.database) return { ok: false, error: "URI MongoDB et base requis." };
  return { ok: true, connectionString: c.connectionString, database: c.database };
}

async function withDb(credentials, fn) {
  if (isTestCredentials(credentials)) return fn(mockDb());
  const cfg = getConfig(credentials);
  if (!cfg.ok) return cfg;

  let MongoClient;
  try { ({ MongoClient } = require("mongodb")); } catch {
    return { ok: false, error: "Le package 'mongodb' n'est pas installé. Exécuter: npm install mongodb dans API/." };
  }

  const client = new MongoClient(cfg.connectionString);
  try {
    await client.connect();
    return await fn(client.db(cfg.database));
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    try { await client.close(); } catch {}
  }
}

function mockDb() {
  const result = { acknowledged: true, insertedId: "mock-id", matchedCount: 0, modifiedCount: 0, deletedCount: 0 };
  return {
    listCollections: () => ({ toArray: async () => [] }),
    command: async () => ({ ok: 1 }),
    collection: () => ({
      find: () => ({ sort: () => ({ limit: () => ({ skip: () => ({ toArray: async () => [] }) }) }) }),
      insertOne: async () => result,
      insertMany: async () => ({ acknowledged: true, insertedCount: 0, insertedIds: {} }),
      updateMany: async () => result,
      deleteMany: async () => result,
      aggregate: () => ({ toArray: async () => [] })
    })
  };
}

function documentsResult(documents, raw) {
  return { ok: true, documents: documents || [], totalCount: (documents || []).length, raw };
}

function writeResult(raw, message) {
  return {
    ok: true,
    message,
    acknowledged: raw?.acknowledged,
    insertedId: raw?.insertedId,
    insertedCount: raw?.insertedCount,
    matchedCount: raw?.matchedCount,
    modifiedCount: raw?.modifiedCount,
    deletedCount: raw?.deletedCount,
    raw
  };
}

module.exports = { utils: { parseJson, withDb, documentsResult, writeResult } };
