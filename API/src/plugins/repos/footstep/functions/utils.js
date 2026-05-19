function getCredentials(opts) {
  const credentials = (opts && opts.credentials) || {};
  const apiKey = String(credentials.apiKey || "").trim();
  if (!apiKey) return { ok: false, error: "Clé API Footstep requise." };

  const baseUrl = String(credentials.baseUrl || "https://api.footstep.ai").replace(/\/+$/, "");
  return { ok: true, apiKey, baseUrl };
}

async function footstepRequest(opts, path, options = {}) {
  const auth = getCredentials(opts);
  if (!auth.ok) return auth;

  const url = new URL(`${auth.baseUrl}${path}`);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const fetchOptions = {
    method: options.method || "GET",
    headers: {
      "x-api-key": auth.apiKey,
      "Content-Type": "application/json"
    }
  };
  if (options.body !== undefined) fetchOptions.body = JSON.stringify(options.body);

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text().catch(() => "");
  let data = text;
  if (text) {
    try { data = JSON.parse(text); } catch {}
  } else {
    data = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.error || data?.message || `Erreur Footstep ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function parseJsonInput(value, label, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error(`JSON invalide dans ${label}.`);
  }
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function compactObject(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

function boolValue(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function mapPlace(r) {
  const coordinates = r?.coordinates || {};
  return {
    label: r?.label,
    name: r?.name,
    lat: coordinates.lat ?? coordinates.latitude ?? r?.lat,
    lon: coordinates.lon ?? coordinates.lng ?? coordinates.longitude ?? r?.lon,
    country: r?.country,
    country_code: r?.country_code,
    region: r?.region,
    locality: r?.locality,
    confidence: r?.confidence,
    place_type: r?.place_type,
    raw: r
  };
}

function geocodingResult(data) {
  const results = Array.isArray(data?.results) ? data.results.map(mapPlace) : [];
  return {
    ok: true,
    totalCount: results.length,
    query: data?.query || null,
    results,
    raw: data
  };
}

function routeResult(data) {
  const route = data?.route || data?.optimized_route || data?.routes?.[0] || {};
  return {
    ok: true,
    distance_meters: route.distance_meters,
    duration_seconds: route.duration_seconds,
    units: route.units,
    narrative: data?.narrative || route.narrative,
    terrain: route.terrain || null,
    bounds: route.bounds || null,
    route,
    alternates: Array.isArray(data?.alternates) ? data.alternates : [],
    raw: data
  };
}

function withOptionalBodyFields(body, inputs, keys) {
  for (const key of keys) {
    const value = inputs[key];
    if (value !== undefined && value !== null && value !== "") body[key] = value;
  }
  return body;
}

module.exports = {
  utils: {
    footstepRequest,
    parseJsonInput,
    toNumber,
    compactObject,
    boolValue,
    geocodingResult,
    routeResult,
    withOptionalBodyFields
  }
};
