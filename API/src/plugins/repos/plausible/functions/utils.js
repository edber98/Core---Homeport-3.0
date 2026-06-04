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

async function requestPlausible(opts, path, options = {}) {
  const credentials = asObject(opts && opts.credentials);
  const baseUrl = clean(credentials.baseUrl || "https://plausible.io").replace(/\/+$/, "");
  const apiKey = clean(credentials.apiKey || credentials.token);
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [k, v] of Object.entries(cleanObj(options.query))) {
    url.searchParams.set(k, String(v));
  }

  const headers = {
    ...(options.headers || {})
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (options.contentType) headers["Content-Type"] = options.contentType;
  else if (options.body !== undefined && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  let body = undefined;
  if (options.body !== undefined) {
    if (headers["Content-Type"] === "application/json" && typeof options.body !== "string") body = JSON.stringify(options.body);
    else body = options.body;
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
      error: data?.message || data?.error || data?.detail || `HTTP ${res.status}`,
      details: data
    };
  }

  return {
    ok: true,
    status: res.status,
    data,
    headers: {
      dropped: res.headers.get("x-plausible-dropped") || "",
      debugIp: res.headers.get("x-debug-ip") || ""
    }
  };
}

function ok(res, message, extra = {}) {
  return { ok: true, status: res.status, message, raw: res.data || null, ...extra };
}

function requireField(d, key) {
  const v = clean(d[key]);
  if (!v) throw new Error(`${key} requis.`);
  return v;
}

async function run(key, inputs, opts) {
  const d = asObject(inputs);

  try {
    if (key === "plausible_stats_query") {
      const siteId = requireField(d, "site_id");
      const body = cleanObj({
        site_id: siteId,
        metrics: parseJsonInput(d.metrics, "metrics", undefined),
        dimensions: parseJsonInput(d.dimensions, "dimensions", undefined),
        filters: parseJsonInput(d.filters, "filters", undefined),
        date_range: parseJsonInput(d.date_range, "date_range", undefined),
        include: parseJsonInput(d.include, "include", undefined),
        order_by: parseJsonInput(d.order_by, "order_by", undefined),
        limit: maybe(d.limit)
      });
      const res = await requestPlausible(opts, "/api/v2/query", { method: "POST", body });
      if (!res.ok) return res;
      return ok(res, "Requête stats exécutée.");
    }

    if (key === "plausible_stats_realtime_visitors") {
      const site_id = requireField(d, "site_id");
      const res = await requestPlausible(opts, "/api/v1/stats/realtime/visitors", { method: "GET", query: { site_id } });
      if (!res.ok) return res;
      const value = typeof res.data === "number" ? res.data : Number(res.data?.visitors || 0);
      return ok(res, "Visiteurs temps réel récupérés.", { count: value });
    }

    if (key === "plausible_stats_aggregate" || key === "plausible_stats_timeseries" || key === "plausible_stats_breakdown") {
      const site_id = requireField(d, "site_id");
      const suffix = key.replace("plausible_stats_", "");
      const path = `/api/v1/stats/${suffix}`;
      const query = cleanObj({
        site_id,
        period: maybe(d.period),
        date: maybe(d.date),
        metrics: maybe(d.metrics),
        filters: maybe(d.filters),
        property: maybe(d.property),
        limit: maybe(d.limit)
      });
      const res = await requestPlausible(opts, path, { method: "GET", query });
      if (!res.ok) return res;
      return ok(res, "Statistiques récupérées.");
    }

    if (key === "plausible_event_track") {
      const payload = cleanObj({
        domain: requireField(d, "domain"),
        name: requireField(d, "name"),
        url: requireField(d, "url"),
        referrer: maybe(d.referrer),
        props: parseJsonInput(d.props, "props", undefined),
        revenue: parseJsonInput(d.revenue, "revenue", undefined),
        interactive: d.interactive === undefined || d.interactive === "" ? undefined : !!d.interactive
      });

      const headers = {};
      const ua = clean(d.user_agent);
      const xff = clean(d.x_forwarded_for);
      if (ua) headers["User-Agent"] = ua;
      if (xff) headers["X-Forwarded-For"] = xff;

      const res = await requestPlausible(opts, "/api/event", { method: "POST", body: payload, headers });
      if (!res.ok) return res;
      return ok(res, "Événement envoyé.", { dropped: res.headers.dropped || "" });
    }

    if (key === "plausible_event_health") {
      const res = await requestPlausible(opts, "/api/health", { method: "GET" });
      if (!res.ok) return res;
      return ok(res, "API Plausible disponible.");
    }

    if (key.startsWith("plausible_site_")) {
      const action = key.replace("plausible_site_", "");

      if (action === "list") {
        const query = cleanObj({ after: maybe(d.after), before: maybe(d.before), limit: maybe(d.limit), team_id: maybe(d.team_id) });
        const res = await requestPlausible(opts, "/api/v1/sites", { method: "GET", query });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.sites) ? res.data.sites : [];
        return ok(res, "Sites récupérés.", { items, totalCount: items.length, nextCursor: res.data?.meta?.after || null });
      }

      if (action === "get") {
        const siteId = requireField(d, "site_id");
        const res = await requestPlausible(opts, `/api/v1/sites/${encodeURIComponent(siteId)}`, { method: "GET" });
        if (!res.ok) return res;
        return ok(res, "Site récupéré.");
      }

      if (action === "create") {
        const body = cleanObj({
          domain: maybe(d.domain),
          timezone: maybe(d.timezone),
          tracker_script_configuration: parseJsonInput(d.tracker_script_configuration, "tracker_script_configuration", undefined)
        });
        const res = await requestPlausible(opts, "/api/v1/sites", { method: "POST", body });
        if (!res.ok) return res;
        return ok(res, "Site créé.");
      }

      if (action === "update") {
        const siteId = requireField(d, "site_id");
        const body = cleanObj({
          domain: maybe(d.domain),
          timezone: maybe(d.timezone),
          tracker_script_configuration: parseJsonInput(d.tracker_script_configuration, "tracker_script_configuration", undefined)
        });
        const res = await requestPlausible(opts, `/api/v1/sites/${encodeURIComponent(siteId)}`, { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Site mis à jour.");
      }

      if (action === "delete") {
        const siteId = requireField(d, "site_id");
        const res = await requestPlausible(opts, `/api/v1/sites/${encodeURIComponent(siteId)}`, { method: "DELETE" });
        if (!res.ok) return res;
        return ok(res, "Site supprimé.");
      }

      if (action === "list_teams") {
        const query = cleanObj({ after: maybe(d.after), before: maybe(d.before), limit: maybe(d.limit) });
        const res = await requestPlausible(opts, "/api/v1/sites/teams", { method: "GET", query });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.teams) ? res.data.teams : [];
        return ok(res, "Équipes récupérées.", { items, totalCount: items.length });
      }

      if (action === "upsert_shared_link") {
        const body = cleanObj({ site_id: maybe(d.site_id), name: maybe(d.name) });
        const res = await requestPlausible(opts, "/api/v1/sites/shared-links", { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Lien partagé créé ou récupéré.");
      }

      if (action === "list_goals") {
        const site_id = requireField(d, "site_id");
        const res = await requestPlausible(opts, "/api/v1/sites/goals", { method: "GET", query: { site_id } });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.goals) ? res.data.goals : [];
        return ok(res, "Objectifs récupérés.", { items, totalCount: items.length });
      }

      if (action === "upsert_goal") {
        const body = cleanObj({
          site_id: maybe(d.site_id),
          goal_type: maybe(d.goal_type),
          event_name: maybe(d.event_name),
          page_path: maybe(d.page_path),
          display_name: maybe(d.display_name),
          custom_props: parseJsonInput(d.custom_props, "custom_props", undefined)
        });
        const res = await requestPlausible(opts, "/api/v1/sites/goals", { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Objectif créé ou récupéré.");
      }

      if (action === "delete_goal") {
        const goalId = requireField(d, "goal_id");
        const body = cleanObj({ site_id: maybe(d.site_id) });
        const res = await requestPlausible(opts, `/api/v1/sites/goals/${encodeURIComponent(goalId)}`, { method: "DELETE", body: Object.keys(body).length ? body : undefined });
        if (!res.ok) return res;
        return ok(res, "Objectif supprimé.");
      }

      if (action === "list_custom_props") {
        const site_id = requireField(d, "site_id");
        const res = await requestPlausible(opts, "/api/v1/sites/custom-props", { method: "GET", query: { site_id } });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.custom_properties) ? res.data.custom_properties : [];
        return ok(res, "Propriétés custom récupérées.", { items, totalCount: items.length });
      }

      if (action === "upsert_custom_prop") {
        const body = cleanObj({ site_id: maybe(d.site_id), property: maybe(d.property) });
        const res = await requestPlausible(opts, "/api/v1/sites/custom-props", { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Propriété custom créée.");
      }

      if (action === "delete_custom_prop") {
        const property = requireField(d, "property");
        const body = cleanObj({ site_id: maybe(d.site_id) });
        const res = await requestPlausible(opts, `/api/v1/sites/custom-props/${encodeURIComponent(property)}`, { method: "DELETE", body: Object.keys(body).length ? body : undefined });
        if (!res.ok) return res;
        return ok(res, "Propriété custom supprimée.");
      }

      if (action === "list_guests") {
        const site_id = requireField(d, "site_id");
        const query = cleanObj({ site_id, after: maybe(d.after), before: maybe(d.before), limit: maybe(d.limit) });
        const res = await requestPlausible(opts, "/api/v1/sites/guests", { method: "GET", query });
        if (!res.ok) return res;
        const items = Array.isArray(res.data?.guests) ? res.data.guests : [];
        return ok(res, "Invités récupérés.", { items, totalCount: items.length });
      }

      if (action === "upsert_guest") {
        const body = cleanObj({ site_id: maybe(d.site_id), email: maybe(d.email), role: maybe(d.role) });
        const res = await requestPlausible(opts, "/api/v1/sites/guests", { method: "PUT", body });
        if (!res.ok) return res;
        return ok(res, "Invité créé ou mis à jour.");
      }

      if (action === "delete_guest") {
        const email = requireField(d, "email");
        const body = cleanObj({ site_id: maybe(d.site_id) });
        const res = await requestPlausible(opts, `/api/v1/sites/guests/${encodeURIComponent(email)}`, { method: "DELETE", body: Object.keys(body).length ? body : undefined });
        if (!res.ok) return res;
        return ok(res, "Invité supprimé.");
      }
    }

    if (key === "plausible_api_request" || key === "plausible_custom_request") {
      const method = clean(d.method || "GET").toUpperCase();
      const reqPath = clean(d.path);
      if (!reqPath) return { ok: false, error: "path requis." };
      const query = parseJsonInput(d.queryParameters, "queryParameters", {});
      const headers = parseJsonInput(d.requestHeaders, "requestHeaders", {});
      const body = d.bodyText ? String(d.bodyText) : parseJsonInput(d.requestBody, "requestBody", undefined);
      const contentType = d.bodyText ? "text/plain" : undefined;
      const res = await requestPlausible(opts, reqPath, { method, query, headers, body, contentType });
      if (!res.ok) return res;
      return ok(res, "Appel API exécuté.");
    }

    return { ok: false, error: "Action inconnue." };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { utils: { run } };
