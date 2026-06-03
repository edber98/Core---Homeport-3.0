function trim(value) {
  return String(value ?? "").trim();
}

function safeJsonParse(value, label = "bodyJson") {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON in : `);
  }
}

async function resolveFile(value, opts) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value === "object" && opts?.files && typeof opts.files.resolveAsBuffer === "function") {
    if (value._type === "fileRef" || value.fileId || value.url) {
      return opts.files.resolveAsBuffer(value);
    }
  }
  if (typeof value === "string" && opts?.files && typeof opts.files.resolveAsBuffer === "function") {
    return opts.files.resolveAsBuffer(value);
  }
  return Buffer.from(String(value), "utf8");
}

function ensureBaseUrl(credentials) {
  const baseUrl = trim(credentials?.baseUrl);
  if (!baseUrl) throw new Error("Missing Appsmith baseUrl.");
  return baseUrl.replace(/\/+$/, "");
}

function buildHeaders(credentials, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {})
  };

  const authToken = trim(credentials?.authToken);
  const sessionCookie = trim(credentials?.sessionCookie);
  const csrfToken = trim(credentials?.csrfToken);

  if (authToken) {
    headers.Authorization = authToken.toLowerCase().startsWith("bearer ") ? authToken : `Bearer ${authToken}`;
  }
  if (sessionCookie) {
    headers.Cookie = sessionCookie;
  }
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
    headers["X-XSRF-TOKEN"] = csrfToken;
  }

  return headers;
}

function buildUrl(baseUrl, path, query) {
  const url = new URL(path, `${baseUrl}/`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeUser(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id, raw?.userId),
    email: pickFirstDefined(raw?.email, raw?.emailAddress),
    name: pickFirstDefined(raw?.name, raw?.username, raw?.displayName),
    currentWorkspaceId: pickFirstDefined(raw?.currentWorkspaceId, raw?.workspaceId),
    currentOrganizationId: pickFirstDefined(raw?.currentOrganizationId, raw?.organizationId),
    isAnonymous: pickFirstDefined(raw?.isAnonymous, raw?.anonymous, false),
    raw
  };
}

function normalizeTenant(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id, raw?.tenantId),
    name: pickFirstDefined(raw?.name, raw?.tenantName),
    slug: pickFirstDefined(raw?.slug, raw?.subdomain),
    raw
  };
}

function normalizeWorkspace(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id, raw?.workspaceId),
    name: pickFirstDefined(raw?.name, raw?.workspaceName),
    description: pickFirstDefined(raw?.description, raw?.desc),
    raw
  };
}

function normalizeApp(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id, raw?.applicationId, raw?.appId),
    name: pickFirstDefined(raw?.name, raw?.applicationName, raw?.appName, raw?.title),
    description: pickFirstDefined(raw?.description, raw?.desc),
    workspaceId: pickFirstDefined(raw?.workspaceId, raw?.workspace_id),
    status: pickFirstDefined(raw?.status, raw?.state, raw?.publishedState),
    createdAt: pickFirstDefined(raw?.createdAt, raw?.createdAtMillis, raw?.createdTime),
    updatedAt: pickFirstDefined(raw?.updatedAt, raw?.updatedAtMillis, raw?.updatedTime),
    raw
  };
}

function normalizeReleaseItem(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id),
    name: pickFirstDefined(raw?.name, raw?.title, raw?.label),
    version: pickFirstDefined(raw?.version, raw?.releaseVersion, raw?.buildVersion),
    status: pickFirstDefined(raw?.status, raw?.state),
    raw
  };
}

function normalizeGitProfile(raw) {
  return {
    id: pickFirstDefined(raw?.id, raw?._id, raw?.profileId),
    name: pickFirstDefined(raw?.name, raw?.profileName),
    provider: pickFirstDefined(raw?.provider, raw?.type, raw?.service),
    raw
  };
}

async function appsmithRequest(opts, path, options = {}) {
  const credentials = (opts && opts.credentials) || {};
  const baseUrl = ensureBaseUrl(credentials);
  const method = options.method || "GET";
  const url = buildUrl(baseUrl, path, options.query);
  const headers = buildHeaders(credentials, options);
  let body;

  if (options.formData) {
    body = new FormData();
    for (const [key, value] of Object.entries(options.formData)) {
      if (value === undefined || value === null || value === "") continue;
      if ((value && value._type === "fileRef") || value?.fileId || value?.url || Buffer.isBuffer(value)) {
        const buffer = await resolveFile(value, opts);
        body.append(key, new Blob([buffer]), value?.name || key);
        continue;
      }
      if (value && typeof value === "object" && value.name && value.content !== undefined) {
        const buffer = await resolveFile(value.content, opts);
        body.append(key, new Blob([buffer]), value.name);
        continue;
      }
      body.append(key, String(value));
    }
  } else if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    const message = typeof data === "string"
      ? data
      : data?.message || data?.error || JSON.stringify(data);
    return { ok: false, error: `Appsmith API error ${res.status}: ${message}`, status: res.status, details: data };
  }

  return { ok: true, status: res.status, data };
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.applications)) return payload.applications;
  return [];
}

module.exports = {
  utils: {
    appsmithRequest,
    normalizeUser,
    normalizeTenant,
    normalizeWorkspace,
    normalizeApp,
    normalizeReleaseItem,
    normalizeGitProfile,
    safeJsonParse,
    resolveFile,
    toArray
  }
};
