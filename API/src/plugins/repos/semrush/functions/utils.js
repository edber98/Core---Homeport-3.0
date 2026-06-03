const API_BASE = "https://api.semrush.com/";

async function readText(res) {
  return res && typeof res.text === "function" ? res.text() : "";
}

function apiKey(opts) {
  return ((opts && opts.credentials) || {}).apiKey || "";
}

function parseCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] || ""; });
    return row;
  });
  return { headers, rows };
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quote = !quote;
      }
    } else if (ch === ";" && !quote) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

async function semrushRequest(opts, params) {
  const key = apiKey(opts);
  if (!key) return { ok: false, error: "Clé API Semrush manquante." };
  const url = new URL(API_BASE);
  url.searchParams.set("key", key);
  for (const [name, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, String(value));
  }

  let res;
  try {
    res = await fetch(url, { method: "GET" });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await readText(res);
  if (!res.ok || /^ERROR/i.test(text)) {
    return { ok: false, error: text || `HTTP ${res.status}`, status: res.status };
  }
  const parsed = parseCsv(text);
  return { ok: true, text, headers: parsed.headers, rows: parsed.rows };
}

function limit(inputs, fallback = 10) {
  return Number((inputs && (inputs.limit || inputs.displayLimit)) || fallback);
}

function database(inputs) {
  return (inputs && inputs.database) || "us";
}

module.exports = { utils: { semrushRequest, parseCsv, limit, database } };
