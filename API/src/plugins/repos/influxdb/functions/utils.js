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

function escapeTagValue(v) {
  return String(v).replace(/,/g, "\\,").replace(/=/g, "\\=").replace(/ /g, "\\ ");
}

function escapeMeasurement(v) {
  return String(v).replace(/,/g, "\\,").replace(/ /g, "\\ ");
}

function toLineProtocolPoint(measurement, tags, fields, time) {
  const tagParts = Object.entries(tags || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${escapeTagValue(k)}=${escapeTagValue(v)}`);

  const fieldParts = Object.entries(fields || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === "number") return `${escapeTagValue(k)}=${v}`;
      if (typeof v === "boolean") return `${escapeTagValue(k)}=${v ? "true" : "false"}`;
      return `${escapeTagValue(k)}="${String(v).replace(/"/g, '\\"')}"`;
    });

  if (!fieldParts.length) throw new Error("fields doit contenir au moins une valeur.");

  const t = cleanString(time);
  return `${escapeMeasurement(measurement)}${tagParts.length ? "," + tagParts.join(",") : ""} ${fieldParts.join(",")}${t ? " " + t : ""}`;
}

async function request(credentials, method, endpoint, body, headers) {
  const baseUrl = cleanString(credentials.baseUrl);
  const token = cleanString(credentials.token);
  if (!baseUrl || !token) return { ok: false, error: "Identifiants InfluxDB requis: baseUrl, token." };

  const url = `${baseUrl.replace(/\/+$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Token ${token}`,
        ...(headers || {})
      },
      body
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}`, status: res.status, details: text };
  }
  return { ok: true, status: res.status, text };
}

function parseCsvRows(csvText) {
  const lines = String(csvText || "").split(/\r?\n/).filter(Boolean);
  const dataLines = lines.filter((line) => !line.startsWith("#"));
  if (!dataLines.length) return { rows: [], fields: [] };
  const headers = dataLines[0].split(",");
  const rows = [];
  for (let i = 1; i < dataLines.length; i += 1) {
    const cols = dataLines[i].split(",");
    const item = {};
    for (let j = 0; j < headers.length; j += 1) item[headers[j]] = cols[j];
    rows.push(item);
  }
  return { rows, fields: headers };
}

function rowsResult(rows, fields, raw) {
  return { ok: true, rowCount: rows.length, fields, rows, raw };
}

function listResult(items, raw) {
  return { ok: true, totalCount: items.length, items, raw: raw || items };
}

function actionResult(message, raw, status = 200) {
  return { ok: true, status, message, raw };
}

async function run(key, inputs, opts) {
  const d = inputs || {};
  const credentials = (opts && opts.credentials) || {};
  if (credentials.baseUrl === "test") {
    if (key.endsWith("_list")) return listResult([], []);
    if (key.includes("query")) return rowsResult([], [], []);
    return actionResult("Mode test.", { test: true });
  }

  try {
    if (key === "influxdb_query_flux") {
      const query = String(d.query || "").trim();
      if (!query) return { ok: false, error: "Requête Flux requise." };
      const org = cleanString(credentials.org);
      if (!org) return { ok: false, error: "Organisation InfluxDB requise dans les identifiants." };
      const res = await request(
        credentials,
        "POST",
        `/api/v2/query?org=${encodeURIComponent(org)}`,
        query,
        {
          Accept: "application/csv",
          "Content-Type": "application/vnd.flux"
        }
      );
      if (!res.ok) return res;
      const parsed = parseCsvRows(res.text);
      return rowsResult(parsed.rows, parsed.fields, res.text);
    }

    if (key === "influxdb_query_influxql") {
      const query = String(d.query || "").trim();
      if (!query) return { ok: false, error: "Requête InfluxQL requise." };
      const body = `q=${encodeURIComponent(query)}`;
      const res = await request(
        credentials,
        "POST",
        "/query",
        body,
        { "Content-Type": "application/x-www-form-urlencoded" }
      );
      if (!res.ok) return res;
      let parsed;
      try { parsed = JSON.parse(res.text); } catch { parsed = { text: res.text }; }
      const results = (parsed && parsed.results) || [];
      const series = results.flatMap((r) => r.series || []);
      const rows = [];
      const fields = new Set();
      for (const s of series) {
        const cols = s.columns || [];
        for (const c of cols) fields.add(c);
        for (const values of s.values || []) {
          const row = {};
          cols.forEach((c, idx) => { row[c] = values[idx]; });
          rows.push(row);
        }
      }
      return rowsResult(rows, [...fields], parsed);
    }

    if (key === "influxdb_write_records") {
      const records = String(d.records || "").trim();
      if (!records) return { ok: false, error: "records requis." };
      const org = cleanString(credentials.org);
      const bucket = cleanString(d.bucket || credentials.bucket);
      const precision = cleanString(d.precision || "ns");
      if (!org || !bucket) return { ok: false, error: "org et bucket sont requis (credentials ou input)." };
      const res = await request(
        credentials,
        "POST",
        `/api/v2/write?org=${encodeURIComponent(org)}&bucket=${encodeURIComponent(bucket)}&precision=${encodeURIComponent(precision)}`,
        records,
        { "Content-Type": "text/plain; charset=utf-8" }
      );
      if (!res.ok) return res;
      return actionResult("Records écrits.", { bucket, precision }, res.status);
    }

    if (key === "influxdb_write_point") {
      const measurement = cleanString(d.measurement);
      if (!measurement) return { ok: false, error: "measurement requise." };
      const tags = parseJson(d.tags, "tags", {});
      const fields = parseJson(d.fields, "fields", null);
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) return { ok: false, error: "fields doit être un objet JSON." };
      const line = toLineProtocolPoint(measurement, tags, fields, d.time);
      const org = cleanString(credentials.org);
      const bucket = cleanString(d.bucket || credentials.bucket);
      if (!org || !bucket) return { ok: false, error: "org et bucket sont requis (credentials ou input)." };
      const res = await request(
        credentials,
        "POST",
        `/api/v2/write?org=${encodeURIComponent(org)}&bucket=${encodeURIComponent(bucket)}&precision=ns`,
        line,
        { "Content-Type": "text/plain; charset=utf-8" }
      );
      if (!res.ok) return res;
      return actionResult("Point écrit.", { line, bucket }, res.status);
    }

    if (key === "influxdb_delete_data") {
      const org = cleanString(credentials.org);
      const bucket = cleanString(d.bucket || credentials.bucket);
      const start = cleanString(d.start);
      const stop = cleanString(d.stop);
      const predicate = cleanString(d.predicate);
      if (!org || !bucket) return { ok: false, error: "org et bucket sont requis (credentials ou input)." };
      if (!start || !stop) return { ok: false, error: "start et stop requis." };

      const payload = { start, stop, predicate };
      const res = await request(
        credentials,
        "POST",
        `/api/v2/delete?org=${encodeURIComponent(org)}&bucket=${encodeURIComponent(bucket)}`,
        JSON.stringify(payload),
        { "Content-Type": "application/json" }
      );
      if (!res.ok) return res;
      return actionResult("Suppression déclenchée.", payload, res.status);
    }

    if (key === "influxdb_buckets_list") {
      const limit = Math.max(1, Math.min(Number(d.limit || 100), 500));
      const res = await request(credentials, "GET", `/api/v2/buckets?limit=${limit}`, undefined, { Accept: "application/json" });
      if (!res.ok) return res;
      let parsed;
      try { parsed = JSON.parse(res.text); } catch { return { ok: false, error: "Réponse JSON invalide." }; }
      const items = (parsed.buckets || []).map((b) => ({ id: b.id, name: b.name, status: b.type || "ok", properties: b, raw: b }));
      return listResult(items, parsed);
    }

    if (key === "influxdb_measurements_list") {
      const org = cleanString(credentials.org);
      const bucket = cleanString(d.bucket || credentials.bucket);
      const start = cleanString(d.start || "-30d");
      if (!org || !bucket) return { ok: false, error: "org et bucket sont requis (credentials ou input)." };
      const query = `import \"influxdata/influxdb/schema\"\nschema.measurements(bucket: \"${bucket.replace(/"/g, '\\"')}\", start: ${start})`;
      const res = await request(
        credentials,
        "POST",
        `/api/v2/query?org=${encodeURIComponent(org)}`,
        query,
        { Accept: "application/csv", "Content-Type": "application/vnd.flux" }
      );
      if (!res.ok) return res;
      const parsed = parseCsvRows(res.text);
      const items = parsed.rows.map((row) => {
        const name = row._value || row._measurement || row.measurement || "";
        return { id: name, name, status: "ok", properties: row, raw: row };
      });
      return listResult(items, parsed.rows);
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run, parseJson, request } };
