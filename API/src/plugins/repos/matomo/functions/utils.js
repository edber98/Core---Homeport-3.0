function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function maybe(value) {
  return value === undefined || value === null || value === "" ? undefined : value;
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

function cleanObj(obj) {
  const out = {};
  for (const [k, v] of Object.entries(asObject(obj))) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

async function requestMatomo(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "https://matomo.example.com").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [k, v] of Object.entries(cleanObj(options.query))) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(`${k}[]`, String(item));
    } else {
      url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    ...(options.headers || {})
  };
  let body = undefined;
  if (options.body !== undefined) {
    if (options.body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = options.body.toString();
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  let res;
  try {
    res = await fetch(url, { method: options.method || "GET", headers, body });
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.message || data?.error || `HTTP ${res.status}`,
      details: data
    };
  }

  return { ok: true, status: res.status, data };
}

function ok(res, message, extra = {}) {
  return { ok: true, status: res.status, message, raw: res.data || null, ...extra };
}

function requireField(d, key) {
  const v = clean(d[key]);
  if (!v) throw new Error(`${key} requis.`);
  return v;
}

function reportingBaseQuery(credentials) {
  const tokenAuth = clean(credentials.tokenAuth);
  const q = { module: "API", format: "JSON" };
  if (tokenAuth) q.token_auth = tokenAuth;
  return q;
}

function trackingBaseQuery(credentials) {
  const tokenAuth = clean(credentials.tokenAuth);
  const q = { send_image: 0 };
  if (tokenAuth) q.token_auth = tokenAuth;
  return q;
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);
  const credentials = asObject(opts && opts.credentials);

  try {
    if (key === "matomo_report_query") {
      const query = cleanObj({
        ...reportingBaseQuery(credentials),
        method: requireField(d, "method"),
        idSite: requireField(d, "idSite"),
        period: maybe(d.period),
        date: maybe(d.date),
        segment: maybe(d.segment),
        filter_limit: maybe(d.filter_limit)
      });
      const res = await requestMatomo(opts, "/index.php", { method: "GET", query });
      if (!res.ok) return res;
      return ok(res, "Rapport Matomo récupéré.");
    }

    if (key === "matomo_report_bulk_query") {
      const urls = parseJsonInput(d.urls, "urls", null);
      if (!Array.isArray(urls) || !urls.length) return { ok: false, error: "urls doit être un tableau non vide." };
      const query = cleanObj({ ...reportingBaseQuery(credentials), method: "API.getBulkRequest" });
      const res = await requestMatomo(opts, "/index.php", { method: "GET", query: { ...query, urls } });
      if (!res.ok) return res;
      return ok(res, "Requête bulk Matomo exécutée.", { sent_count: urls.length });
    }

    if (key === "matomo_report_list_sites") {
      const query = cleanObj({ ...reportingBaseQuery(credentials), method: clean(d.method || "SitesManager.getAllSites") });
      const res = await requestMatomo(opts, "/index.php", { method: "GET", query });
      if (!res.ok) return res;
      const items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.result) ? res.data.result : []);
      return ok(res, "Sites Matomo récupérés.", { items, totalCount: items.length });
    }

    if (key === "matomo_report_last_visits") {
      const query = cleanObj({
        ...reportingBaseQuery(credentials),
        method: clean(d.method || "Live.getLastVisitsDetails"),
        idSite: requireField(d, "idSite"),
        period: maybe(d.period),
        date: maybe(d.date),
        segment: maybe(d.segment),
        countVisitorsToFetch: maybe(d.countVisitorsToFetch)
      });
      const res = await requestMatomo(opts, "/index.php", { method: "GET", query });
      if (!res.ok) return res;
      const items = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.result) ? res.data.result : []);
      return ok(res, "Dernières visites récupérées.", { items, totalCount: items.length });
    }

    if (key === "matomo_tracking_track_event" || key === "matomo_tracking_track_pageview") {
      const query = cleanObj({
        ...trackingBaseQuery(credentials),
        idsite: requireField(d, "idsite"),
        rec: maybe(d.rec || 1),
        url: requireField(d, "url"),
        action_name: maybe(d.action_name),
        uid: maybe(d.uid),
        cid: maybe(d.cid),
        e_c: maybe(d.e_c),
        e_a: maybe(d.e_a),
        e_n: maybe(d.e_n),
        e_v: maybe(d.e_v)
      });

      if (key === "matomo_tracking_track_event") {
        if (!query.e_c || !query.e_a) return { ok: false, error: "e_c et e_a requis pour un événement." };
      }

      const res = await requestMatomo(opts, "/matomo.php", { method: "POST", query });
      if (!res.ok) return res;
      return ok(res, key === "matomo_tracking_track_event" ? "Événement tracké." : "Page vue trackée.");
    }

    if (key === "matomo_tracking_track_goal" || key === "matomo_tracking_track_ecommerce_order" || key === "matomo_tracking_track_ecommerce_cart_update") {
      const query = cleanObj({
        ...trackingBaseQuery(credentials),
        idsite: requireField(d, "idsite"),
        rec: 1,
        url: requireField(d, "url"),
        uid: maybe(d.uid),
        cid: maybe(d.cid),
        idgoal: maybe(d.idgoal),
        revenue: maybe(d.revenue),
        ec_id: maybe(d.ec_id),
        ec_st: maybe(d.ec_st),
        ec_tx: maybe(d.ec_tx),
        ec_sh: maybe(d.ec_sh),
        ec_dt: maybe(d.ec_dt)
      });

      if (key === "matomo_tracking_track_goal" && !query.idgoal) return { ok: false, error: "idgoal requis." };
      if (key === "matomo_tracking_track_ecommerce_order" && !query.ec_id) return { ok: false, error: "ec_id requis." };
      if (key === "matomo_tracking_track_ecommerce_cart_update" && query.revenue === undefined) return { ok: false, error: "revenue requis." };

      const res = await requestMatomo(opts, "/matomo.php", { method: "POST", query });
      if (!res.ok) return res;
      return ok(res, "Tracking ecommerce/goal envoyé.");
    }

    if (key === "matomo_api_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.queryParameters, "queryParameters", {});
      const headers = parseJsonInput(d.requestHeaders, "requestHeaders", {});
      const body = d.bodyText ? String(d.bodyText) : parseJsonInput(d.requestBody, "requestBody", undefined);
      const res = await requestMatomo(opts, reqPath, { method, query, headers, body });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
